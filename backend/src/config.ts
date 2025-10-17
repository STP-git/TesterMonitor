// @ts-ignore
import { promises as fs } from "fs";
// @ts-ignore
import path from "path";
// @ts-ignore
import { fileURLToPath } from "url";
import { Config, Tester, ApiResponse } from "./types";

// Get __dirname equivalent in ES modules
// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
// @ts-ignore
const __dirname = path.dirname(__filename);

// @ts-ignore
const CONFIG_FILE_PATH = process.env.CONFIG_FILE || path.resolve(process.cwd(), "data/config.json");

// Log the exact path being used
console.log(`Config file path: ${CONFIG_FILE_PATH}`);
// @ts-ignore
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Script directory: ${__dirname}`);
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
      
      // Ensure the directory exists
      const dir = path.dirname(this.configPath);
      console.log(`Config directory: ${dir}`);
      console.log(`Config file path: ${this.configPath}`);
      
      try {
        await fs.access(dir);
        console.log(`Directory ${dir} is accessible`);
      } catch (error) {
        console.log(`Directory ${dir} not accessible, creating it...`);
        await fs.mkdir(dir, { recursive: true });
        console.log(`Directory ${dir} created`);
      }
      
      const configData = JSON.stringify(config, null, 2);
      console.log(`Writing config data: ${configData}`);
      
      try {
        await fs.writeFile(this.configPath, configData, 'utf-8');
        console.log(`Configuration successfully saved to ${this.configPath}`);
        
        // Verify the file was written correctly
        const verifyData = await fs.readFile(this.configPath, 'utf-8');
        console.log(`Verification - file content: ${verifyData}`);
        
        // Parse and verify the structure
        try {
          const parsedConfig = JSON.parse(verifyData);
          console.log(`Parsed config contains ${parsedConfig.testers?.length || 0} testers`);
          if (parsedConfig.testers && parsedConfig.testers.length > 0) {
            console.log(`Last tester in config:`, parsedConfig.testers[parsedConfig.testers.length - 1]);
          }
        } catch (parseError) {
          console.error(`Failed to parse saved config: ${parseError}`);
        }
      } catch (writeError) {
        console.error(`Failed to write config file: ${writeError}`);
        console.error(`Error details:`, writeError);
        throw writeError;
      }
      
      this.config = config;
      return true;
    } catch (error) {
      console.error("Error saving config:", error);
      console.error("Full error details:", error);
      throw error; // Instead of returning false, throw the error to properly handle it
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
      console.log(`Adding tester: ${JSON.stringify(tester)}`);
      
      if (!this.config) {
        console.log("Loading config...");
        await this.loadConfig();
        console.log(`Config loaded: ${JSON.stringify(this.config)}`);
      }

      // Check for duplicate ID
      const existingTester = this.config?.testers.find(t => t.id === tester.id);
      if (existingTester) {
        console.log(`Duplicate tester ID found: ${tester.id}`);
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
        console.log("Invalid tester data - missing required fields");
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
        console.log(`Invalid URL format: ${tester.url}`);
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid URL format"
          }
        };
      }

      console.log(`Adding tester to config. Current testers count: ${this.config!.testers.length}`);
      this.config!.testers.push(tester);
      console.log(`New testers count: ${this.config!.testers.length}`);
      
      console.log("Saving config...");
      const saveResult = await this.saveConfig(this.config!);
      console.log(`Save result: ${saveResult}`);

      return {
        success: true,
        message: "Tester added successfully",
        data: tester
      };
    } catch (error) {
      console.error("Error in addTester:", error);
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