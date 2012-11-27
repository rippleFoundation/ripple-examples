/*
arrows on lines so we see direction of trust.
	annoying since we have to scoot the arrows back so they don't get overwritten by the circle
 drop down that let's you choose the currency to see the trust paths of
 import a blob for annotations.
 if it gets too big allow you to select an account to start from and expand as they click
 show balance of the trust lines?

Show sends as animation


*/

var gRoot={};
var remote;
var server = {};
server.socket = null; 

$(document).ready(function()
{
	setUpD3();
	var str = "ws://" + Options.server.websocket_ip + ":";
	
	str += Options.server.websocket_port;
	str += "/";
	
	server.socket = new WebSocket(str);
	server.socket.onopen = function () { gRoot.connected(); }
	server.socket.onmessage = gRoot.handleMsg;
	server.socket.onclose = function () { console.log("disconnected from websocket"); } 
	
	//server.subscribe("transactions");
	//server.send({'command': 'transaction_entry', 'hash': "7A852DC7AACBEBBFB05C954785DBB37C5DB6B97DD2E236F0BCEC67C3C6B6CE63", 'ledger_closed':"2DC4E79AF0E137AC56E2D1218AC1DE228612B56A97B958750F0DFD5CAE1E65D7"});
}); 

function addNode(id) 
{
	var account={};
	account.Account=id;
	account.Balance=10000;
    gRoot.nodes.push(account);
    update();
    return("ok");
}

gRoot.connected =function()
{
	console.log("connected to websocket");
	
	var command = '{"command":"ledger", "params" : [ "lastclosed" , "full" ] }';
	server.socket.send(command);
	
	command= '{"command":"subscribe", "streams" : [ "transactions" ]}';
	server.socket.send(command);
}

gRoot.handleMsg=function(msg)
{
	//console.log("gRoot.handleMsg");
	console.log(msg);
	var obj = jQuery.parseJSON(msg.data);
	if(obj && obj.result && obj.result.ledger)
	{
		onLedger(obj.result.ledger);
	}else if(obj.transaction)
	{
		onTransaction(obj);
	}
	
};


function filloutLedgerData(ledger)
{
  $('#LedgerInfoHash').text(ledger.hash);
  $('#LedgerInfoParentHash').text(ledger.parentHash);
  $('#LedgerInfoNumber').text(ledger.seqNum);

  var total=ledger.totalCoins /BALANCE_DISPLAY_DIVISOR;
    total=addCommas(total);
  $('#LedgerInfoTotalCoins').text(total);
  $('#LedgerInfoDate').text(ledger.closeTime);


  stateStr = (ledger.accepted ? 'accepted ' : 'unaccepted ') +
             (ledger.closed ? 'closed ' : 'open ');

  $('#LedgerInfoState').text(stateStr);
}

function onLedger(ledger)
{
  
    var i, account;
    filloutLedgerData(ledger);

    var nodeMap={};
    var nodeArray=[];
    var accounts = ledger.accountState;
    for (i = 0; i < accounts.length; i++)
    {
      account=accounts[i];

      if(account.LedgerEntryType == "AccountRoot")
      {
    	  if( "undefined" == typeof nodeMap[account.Account])
    	  {
    		  nodeMap[account.Account]=nodeArray.length;
    		  nodeArray.push(account);
        }
      }
    }

    var lines=[];

    for (i = 0; i < accounts.length; i++)
    {
      account=accounts[i];

      if(account.LedgerEntryType == "RippleState")
      {
        var link={};
        link.source=nodeMap[ account.LowLimit.issuer ];
        link.target=nodeMap[ account.HighLimit.issuer ];
        link.currency=account.Balance.currency;
        link.LowLimit=account.LowLimit.value;
        link.HighLimit=account.HighLimit.value;
        link.value= parseFloat(account.LowLimit.value) + parseFloat(account.HighLimit.value);

        lines.push(link);
        }
    }


    $('#LedgerNumAccounts').text(nodeArray.length);


    gRoot.nodeMap=nodeMap;
    gRoot.nodeArray=nodeArray;
    gRoot.lines=lines;
    drawGraph(nodeArray,lines);
}

/*
{"engine_result":"tesSUCCESS","engine_result_code":0,"engine_result_message":"The transaction was applied.","ledger_hash":"F80AEA14B5232AE428E476594091E647BC5736469544BB49A7245DACFCCAF70D","ledger_index":6,
"meta":{"AffectedNodes":[{"ModifiedNode":{"FinalFields":{"Account":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh","Balance":"99999998999999000","Flags":0,"Sequence":2},"LedgerEntryType":"AccountRoot","LedgerIndex":"2B6AC232AA4C4BE41BF49D2459FA4A0347E1B543A4C92FCEE0821C0201E2E9A8","PreviousFields":{"Balance":"100000000000000000","Sequence":1}}},{"CreatedNode":{"LedgerEntryType":"AccountRoot","LedgerIndex":"63EC32A6B58DDE6534A25672A4C3754C05C2063B920B5EA544CDB49C6E3B2F26"}}],"TransactionResult":"tesSUCCESS"},
"status":"closed",
"transaction":{"Account":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh","Amount":"1000","Destination":"rwcQbuaLBUgS9ySP1v9x2WfyBWC9xBARRV","Fee":"1000000000","Flags":65536,"Sequence":1,"SigningPubKey":"0330E7FC9D56BB25D6893BA3F317AE5BCF33B3291BD63DB32654A313222F7FD020","TransactionType":"Payment","TxnSignature":"304502210082F39089B56B07E3737AD5211F337C304209BD0E6FD806927E66E332FE4E31DF022027207F78ED1F188489AB9DB29E8EB37F628DC76069A473AD1FCE750A504C8D2E","hash":"3F329C8A0916DDEF13C613FB26AE443DD8FE6E5424371F90493BCFCE9E4151E4"},
"type":"transaction"}
 */
function onTransaction(obj)
{
	if(obj.meta && obj.meta.AffectedNodes)
	{
		for(var n=0; n<obj.meta.AffectedNodes.length; n++)
		{
			processAffectedNode(obj.meta.AffectedNodes[n]);
		}
	}
}

function processAffectedNode(node)
{
	if(node.ModifiedNode)
	{
		if(node.ModifiedNode.LedgerEntryType=="AccountRoot")
		{
			var nodeIndex=gRoot.nodeMap[node.ModifiedNode.FinalFields.Account];
			if( "undefined" !== typeof nodeIndex )
			{
				if(node.ModifiedNode.FinalFields.Balance) gRoot.nodes[nodeIndex].Balance=node.ModifiedNode.FinalFields.Balance;
			}else console.log("Node not found: "+node.ModifiedNode.FinalFields.Account);
		}else if(node.ModifiedNode.LedgerEntryType=="RippleState")
		{
			// TODO: need to find the old link
			var fields=node.ModifiedNode.FinalFields;
			
			var source=gRoot.nodeMap[ fields.LowLimit.issuer ];
			var target=gRoot.nodeMap[ fields.HighLimit.issuer ];
			
			for(var n=0; n<gRoot.links.length; n++)
			{
				if(gRoot.links[n].source.index==source && gRoot.links[n].target.index == target)
				{
					gRoot.links[n].currency=fields.Balance.currency;
					gRoot.links[n].LowLimit=fields.LowLimit.value;
					gRoot.links[n].HighLimit=fields.HighLimit.value;
					gRoot.links[n].value= parseFloat(fields.LowLimit.value) + parseFloat(fields.HighLimit.value);
					update();
					return;
				}
			}
		}
	}else if(node.CreatedNode)
	{
		if(node.CreatedNode.LedgerEntryType === "AccountRoot")
		{
			var account=node.CreatedNode.NewFields;
			if(account)
			{
				gRoot.nodeMap[account.Account]=gRoot.nodes.length;
				gRoot.nodes.push(account);
				update();
			}
		}else if(node.CreatedNode.LedgerEntryType=="RippleState")
		{
			var fields;
			if(node.CreatedNode.NewFields) fields=node.CreatedNode.NewFields;
			else fields=node.CreatedNode.FinalFields;
			
			var link={};
			link.source=gRoot.nodes[gRoot.nodeMap[ fields.LowLimit.issuer ]];
			link.target=gRoot.nodes[gRoot.nodeMap[ fields.HighLimit.issuer ]];
			link.currency=fields.Balance.currency;
			link.LowLimit=fields.LowLimit.value;
			link.HighLimit=fields.HighLimit.value;
			link.value= parseFloat(fields.LowLimit.value) + parseFloat(fields.HighLimit.value);

			gRoot.links.push(link);
			update();
		}
	}
}



function setUpD3()
{
    gRoot.first=true;
    var width = 700, height = 700;

    gRoot.color = d3.scale.category10();



    gRoot.force = d3.layout.force()
        .charge(-250)
        .linkDistance(100)
        .size([width, height]);

    gRoot.svg= d3.select("#TestSVG")
        .attr("width", width)
        .attr("height", height);

    gRoot.svg.append("svg:defs").selectAll("marker")
    .data(["arrow"])
  .enter().append("svg:marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
  .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");
    
}


function drawGraph(nodes,links)
{
	  gRoot.force
	    .nodes(nodes)
	    .links(links);
	  
	 gRoot.nodes=gRoot.force.nodes();
	 gRoot.links=gRoot.force.links();
	 
     

    var path = gRoot.svg.append("svg:g").selectAll("path")
    .data(gRoot.force.links())
  .enter().append("svg:path")
    .attr("class", "link" )
    .attr("marker-end", function(d) { return "url(#arrow)"; });

    gRoot.force.on("tick", function()
    		 {
    		  

    			
    			gRoot.link
    			.attr("x1", function(d) { return d.source.x; })
    			.attr("y1", function(d) { return d.source.y; })
    			.attr("x2", function(d) { return d.target.x; })
    			.attr("y2", function(d) { return d.target.y; });
    			
    			
    			gRoot.node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    			
    			  //node.attr("cx", function(d) { return d.x; })       .attr("cy", function(d) { return d.y; });

    		  });
    
     
      update();
}


function update()
{	 	 
	
	gRoot.link = gRoot.svg.selectAll("line.link")
		.data(gRoot.links);

	var linkEnter =gRoot.link.enter().append("line")
	    .attr("class", "link")
	    .on("mouseover", function(d) { overLink(d); });
	
	linkEnter.append("title")
		.text(function(d) { return d.value; });
	
	gRoot.link
    	.style("stroke-width", function(d) { return Math.min(20,Math.log(d.value)); });
	
	gRoot.link.exit().remove();

	//gRoot.node = gRoot.svg.selectAll("circle.node")
	gRoot.node = gRoot.svg.selectAll("g.node")
		.data(gRoot.nodes);


	var nodeEnter = gRoot.node.enter().append("g")
		.attr("class", "node")
		.on("mouseout", outNode)
		.on("mouseover", inNode)
		.call(gRoot.force.drag);
 

	nodeEnter.append("circle")
		//.attr("r", function(d) { return Math.min(70,5+(Math.log(d.Balance/BALANCE_DISPLAY_DIVISOR)/ Math.LOG10E)); })
	    .attr("r", function(d) { return Math.min(40,5+Math.sqrt(d.Balance/BALANCE_DISPLAY_DIVISOR)/10); })  // TODO: this doesn't update
	    .style("fill", gRoot.color(1) )
	    .style("stroke", "black")
	    .on("mouseover", function(d) { overNode(d); });


	nodeEnter.append("title")
    	.text(function(d) { return d.Account; });

	gRoot.node.exit().remove();
	
	
	

 
    gRoot.force.start();   
}

addCommas = function (n)
{
  if (!/^\d+(.\d*)?$/.test(n)) throw "Invalid number format.";

  var s = n.toString(),
      m = s.match(/^(\d+?)((\d{3})*)(\.\d*)?$/),
      whole = [m[1]].concat(m[2].match(/\d{3}/g) || []),
      fract = m[4] || "";

  return whole + fract;
};

function outNode() {
  d3.select(this).select("circle").style("fill", gRoot.color(1) );
}

function inNode(node)
{
  d3.select(this).select("circle").style("fill", gRoot.color(2) );
}

function overNode(node)
{
  //node.select("circle").style("fill", gRoot.color(2) );
  //node.style("fill", gRoot.color(2) );
  //d3.select(this).select("circle").style("fill", gRoot.color(2) );


    // we can look up all the details since we pulled the whole ledger
    var bal=node.Balance /BALANCE_DISPLAY_DIVISOR;
    bal=addCommas(bal);

    $('#NodeData').html(node.Account+"<br>"+bal+" XRP");
}

function overLink(node)
{
    $('#NodeData').html(node.currency+"<br>"+addCommas(node.LowLimit)+" -- "+addCommas(node.HighLimit));
}




//////////////////////
// so we don't have to include everything

var ncc = {};
ncc.status={};

ncc.status.error = function (error, json) {
  console.log("ERROR: " + error);
};

ncc.status.info = function (status, json) {
  console.log("INFO: " + status);
};



