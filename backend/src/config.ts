import { promises as fs } from "fs";
import { join } from "path";
import { Config, Tester, ApiResponse } from "./types";

const CONFIG_FILE_PATH = process.env.CONFIG_FILE || "./data/config.json";
const DEFAULT_CONFIG: Config = {
  testers: [
    {
      id: "ist13",
      display_name: "IST13",
      url: "http://192.168.140.114:8080"
    }
  ],
  displaySettings: {
    testersPerRow: 3,
    refreshInterval: 15
  }
};

export class ConfigManager {
  private config: Config | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || CONFIG_FILE_PATH;
  }

  async loadConfig(): Promise<Config> {
    try {
      try {
        await fs.access(this.configPath);
      } catch {
        console.log(`Config file not found at ${this.configPath}, creating default config`);
        await this.saveConfig(DEFAULT_CONFIG);
        this.config = DEFAULT_CONFIG;
        return DEFAULT_CONFIG;
      }

      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData) as Config;
      
      // Validate config structure
      this.validateConfig(this.config);
      
      return this.config;
    } catch (error) {
      console.error("Error loading config:", error);
      console.log("Using default config");
      this.config = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  async saveConfig(config: Config): Promise<boolean> {
    try {
      this.validateConfig(config);
      
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      this.config = config;
      return true;
    } catch (error) {
      console.error("Error saving config:", error);
      return false;
    }
  }

  getConfig(): Config | null {
    return this.config;
  }

  async getTesters(): Promise<Tester[]> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config?.testers || [];
  }

  async addTester(tester: Tester): Promise<ApiResponse<Tester>> {
    try {
      if (!this.config) {
        await this.loadConfig();
      }

      // Check for duplicate ID
      const existingTester = this.config?.testers.find(t => t.id === tester.id);
      if (existingTester) {
        return {
          success: false,
          error: {
            code: "DUPLICATE_ID",
            message: `Tester with ID '${tester.id}' already exists`
          }
        };
      }

      // Validate tester data
      if (!tester.id || !tester.display_name || !tester.url) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Tester must have id, display_name, and url"
          }
        };
      }

      // Validate URL format
      try {
        new URL(tester.url);
      } catch {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid URL format"
          }
        };
      }

      this.config!.testers.push(tester);
      await this.saveConfig(this.config!);

      return {
        success: true,
        message: "Tester added successfully",
        data: tester
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CONFIG_ERROR",
          message: "Failed to add tester",
          details: error
        }
      };
    }
  }

  async updateTester(id: string, updates: Partial<Tester>): Promise<ApiResponse<Tester>> {
    try {
      if (!this.config) {
        await this.loadConfig();
      }

      const testerIndex = this.config!.testers.findIndex(t => t.id === id);
      if (testerIndex === -1) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Tester with ID '${id}' not found`
          }
        };
      }

      // Validate URL if provided
      if (updates.url) {
        try {
          new URL(updates.url);
        } catch {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid URL format"
            }
          };
        }
      }

      // Ensure required fields are maintained
      const existingTester = this.config!.testers[testerIndex];
      if (!existingTester) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Tester with ID '${id}' not found`
          }
        };
      }
      
      const updatedTester: Tester = {
        id: existingTester.id,
        display_name: updates.display_name || existingTester.display_name,
        url: updates.url || existingTester.url
      };
      
      this.config!.testers[testerIndex] = updatedTester;
      await this.saveConfig(this.config!);

      return {
        success: true,
        message: "Tester updated successfully",
        data: updatedTester
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CONFIG_ERROR",
          message: "Failed to update tester",
          details: error
        }
      };
    }
  }

  async deleteTester(id: string): Promise<ApiResponse> {
    try {
      if (!this.config) {
        await this.loadConfig();
      }

      const testerIndex = this.config!.testers.findIndex(t => t.id === id);
      if (testerIndex === -1) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Tester with ID '${id}' not found`
          }
        };
      }

      this.config!.testers.splice(testerIndex, 1);
      await this.saveConfig(this.config!);

      return {
        success: true,
        message: "Tester deleted successfully"
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CONFIG_ERROR",
          message: "Failed to delete tester",
          details: error
        }
      };
    }
  }

  async getDisplaySettings() {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config?.displaySettings || DEFAULT_CONFIG.displaySettings;
  }

  async updateDisplaySettings(settings: Partial<Config["displaySettings"]>): Promise<ApiResponse> {
    try {
      if (!this.config) {
        await this.loadConfig();
      }

      // Validate settings
      if (settings.testersPerRow !== undefined) {
        if (settings.testersPerRow < 1 || settings.testersPerRow > 5) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "testersPerRow must be between 1 and 5"
            }
          };
        }
      }

      if (settings.refreshInterval !== undefined) {
        if (settings.refreshInterval < 15) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "refreshInterval must be at least 15 seconds"
            }
          };
        }
      }

      this.config!.displaySettings = { ...this.config!.displaySettings, ...settings };
      await this.saveConfig(this.config!);

      return {
        success: true,
        message: "Display settings updated successfully"
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CONFIG_ERROR",
          message: "Failed to update display settings",
          details: error
        }
      };
    }
  }

  private validateConfig(config: Config): void {
    if (!config.testers || !Array.isArray(config.testers)) {
      throw new Error("Invalid config: testers must be an array");
    }

    if (!config.displaySettings) {
      throw new Error("Invalid config: displaySettings is required");
    }

    if (typeof config.displaySettings.testersPerRow !== 'number' || 
        config.displaySettings.testersPerRow < 1 || 
        config.displaySettings.testersPerRow > 5) {
      throw new Error("Invalid config: testersPerRow must be between 1 and 5");
    }

    if (typeof config.displaySettings.refreshInterval !== 'number' || 
        config.displaySettings.refreshInterval < 15) {
      throw new Error("Invalid config: refreshInterval must be at least 15");
    }

    // Validate each tester
    for (const tester of config.testers) {
      if (!tester.id || !tester.display_name || !tester.url) {
        throw new Error("Invalid config: each tester must have id, display_name, and url");
      }

      try {
        new URL(tester.url);
      } catch {
        throw new Error(`Invalid config: invalid URL for tester ${tester.id}`);
      }
    }
  }
}

// Singleton instance
export const configManager = new ConfigManager();