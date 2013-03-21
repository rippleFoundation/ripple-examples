$(function() {
    rpc = {}

    rpc.container = $('#history tbody');

    rpc.url = 'http://s1.ripple.com:51234';

    // Get the transaction type
    rpc.getTransactionTypeCssClass = function(transaction) {
        // CSS class names comes from twitter bootstrap default class names

        // Payment
        if (transaction.Destination) {
            return 'success';
        }

        // Offer
        if (transaction.TakerGets && transaction.TakerPays) {
            return 'error'
        }

        // Other
        return 'white';
    }

    rpc.fillHistory = function(data) {
        // Remove all existing rows
        rpc.container.empty();

        var rows = '';

        // Fields to show
//        var fields = ['Account','Fee','TakerGets','TakerPays.value','Status'];

        // Add rows based on the data
        $(data.result.txs).each(function(key,row){
            // row type
            var type = rpc.getTransactionTypeCssClass(row);

            // begin row
            rows = rows + '<tr class="' + type + '">';

            var Destination = row.Destination ? row.Destination :
                row.TakerGets ? row.TakerGets : '';

            var Amount = row.Amount ? row.Amount :
                row.TakerPays ? row.TakerPays : '';

            // Amount
            if (Amount.value !== undefined) {
                Amount = Amount.value + ' (' + Amount.currency + ')';
            }

            rows = rows + '<td>' + row.Account + '</td>'
                        + '<td>' + Destination + '</td>'
                        + '<td>' + Amount + '</td>'
                        + '<td>' + row.inLedger + '</td>';
            // end row
            rows = rows + '</tr>';
        })

        rpc.container.append(rows);

        // Pagination buttons
        rpc.showHidePaginationButtons();
    }

    var index = 0;

    // request object getting the history
    var req = {
        method: 'tx_history',
        params: [{'start' : index}]
    }

    // Call for getting the history
    rpc.call = function (req) {
        $.ajax({
            type: 'POST',
            url: rpc.url,
            data: JSON.stringify(req),
            success: function(data) {
                console.log(data);
                rpc.fillHistory(data);
            },
            error: function (){console.log('fail')},
            dataType: "json"
        });
    };

    // First page of results
    rpc.call(req);

    // Don't show prev button if it's the first page
    rpc.showHidePaginationButtons = function() {
        // Prev button
        if (index == 0) {
            $('#prevButton').hide();
        } else {
            $('#prevButton').show();
        }

        // Next button
        if (!rpc.container.html()) {
            $('#nextButton').hide();
        } else {
            $('#nextButton').show();
        }
    }

    // Next button click handler
    $('#nextButton').click(function(){
        index += 20;

        req.params = [{'start' : index}];
        rpc.call(req);

        return false;
    });

    // Prev button click handler
    $('#prevButton').click(function(){
        index -= 20;

        req.params = [{'start' : index}];
        rpc.call(req);

        return false;
    });
})
