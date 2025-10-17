Task
⦁	Has a hide-able menu bar at the left of page
⦁	first page is Tester monitoring other will implement later
⦁	Create a Tester Monitoring by fetching data from url as html data and filter focusing data and showup
⦁	web page can configuration tester list by add/remove/edit tester list by id,display_name,url
⦁	in the same configuration can config number of tester per row (maximum 5/ default 3)
⦁	in the same configuration can config time to refetch to auto refetching data (minimum/default time 15 seconds)
⦁	show tester list and has a tick box to select then click monitoring to fetching data
⦁	show Web status (online/offline)
⦁	card auto adjust shape by config and window scale
⦁	Please make this system by lightweight principle to avoid affect to other processing

our configuration file>
id: ist13
display_name: IST13
url:http://192.168.140.114:8080

Data from fetch <url>
it should be html response but we can and focus by these following
1.Slot Card
Slot Heading
1.class="panel-heading"
class = "chassisname"
href="/status/1/SLOT01">SLOT01<

class="slot-sn">SFT<

class="chassisstatus">passed<

class="testtime">1:19:45<

Slot body
2.class="panel-body"
class="slot-sn"
href="/status/SLOT01">
332404254207449

Slot Footer
4.Class="panel-footer"
class="slot-sn fw-bold">Production<
class="slot-sn fw-bold">AZ3324_2025.10.08-01

expected result in Tester Card
[SLOT01       passed          SFT] <-- Header
__________________________________
[SN: 332404254207449      1:19:45] <-- Body
__________________________________
[Production  AZ3324_2025.10.08-01] <--Footer      

The slot card is sub-card for Tester card
Tester card will shown
[IST13	                       {link symbolic}]
[ Testing | FAILING | PASSED | FAILED| ABORTED]
[    12   |    0    |    3   |   1   |    0   ]  	
_______________________________________________
card {SLOT01}
card {SLOT02}
...                 <--- Slot card is sub-slot it should scroll-able inside tester card
card {SLOTN} in this tester case we have 16 slot should be SLOT16

when click the tester card it lead to tester url