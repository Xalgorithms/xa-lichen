(function () {
  var form_vm = {
    transaction_id:  ko.observable(),
    rules:           ko.observableArray(),
    transformations: ko.observableArray()
  };

  var vm = {
  };

  function associate(tr) {
    $('#modal-associate').modal('toggle');
    form_vm.transaction_id(tr.id);
  }

  function init() {
    console.log('transactions: init');

    var styles = {
      'open' : 'panel-success',
      'closed' : 'panel-info'
    };

    var documents = {
    };

    var rules = ko.observableArray();
    
    $('.new_transaction_associate_rule_event').on('ajax:success', function (e, o) {
      $('#modal-associate').modal('toggle');
      $.getJSON(o.url, function (o) {
	var tr = _.find(vm.transactions(), function (tr) {
	  return tr.id == o.transaction.id;
	});
	if (tr) {
	  tr.associations.push(o);
	}
      });    
    });

    _.each(transactions, function (tr) {
      _.each(tr.invoices, function (inv) {
	_.set(documents, inv.id, ko.observable());
	$.getJSON(inv.document.url, function (content) {
	  _.get(documents, inv.id)(content);
	});
      });
    });

    $.getJSON(Routes.api_v1_rules_path(), function (o) {
      form_vm.rules(o);
    });

    $.getJSON(Routes.api_v1_transformations_path(), function (o) {
      form_vm.transformations(o);
    });

    vm.transactions = ko.observableArray(transactions);

    // TODO: clean this up
    vm.transaction_view_models = ko.computed(function () {
      var vms = _.map(vm.transactions(), function (tr) {
	var vm = _.extend({}, tr, {
	  panel_style :     _.get(styles, tr.status, 'panel-info'),
	  status_label      : _.get(labels, tr.status),
	  trigger_associate : associate,
	  invoices:         _.map(tr.invoices, function (invoice) {
	    return _.extend({}, invoice, {
	      content: _.get(documents, invoice.id)
	    });
	  }),
	  trigger_close:    function (o) {
	    $.post(Routes.api_v1_events_path(), {
	      event_type: 'transaction_close',
	      transaction_close_event: { transaction_public_id: o.id }
	    }, function (resp) {
	      $.getJSON(resp.url, function (evt) {
		vm.transactions.remove(function (it) {
		  return it.id == evt.transaction.id;
		});
		$.getJSON(evt.transaction.url, function (tr) {
		  vm.transactions.push(tr);
		});
              });
	    });
	  },
          trigger_execute: function (o) {
            $.post(Routes.api_v1_events_path(), {
              event_type: 'transaction_execute',
              transaction_execute_event: { transaction_public_id: o.id }
            }, function (resp) {
              $.getJSON(resp.url, function (evt) {
		console.log(evt);
	      });
            });
          },
	  associations:     ko.observableArray(tr.associations)
	});

	// computeds
	vm.format_url = ko.computed(function () {
	  return Routes.api_v1_transformation_path(tr.id);
	});
	
	vm.closed = ko.computed(function () {
	  return 'closed' === tr.status;
	});
	
	vm.have_invoices = ko.computed(function () {
	  return vm.invoices.length > 0;
	});

	vm.have_associations = ko.computed(function () {
	  return vm.associations().length > 0;
	});
	
	return vm;
      });

      return _.chunk(vms, 4);
    });

    vm.add = function () {
      $.post(Routes.api_v1_events_path(), {
	event_type: 'transaction_open',
	transaction_open_event: { user_id: user_id }
      }, function (resp) {
	$.getJSON(resp.url, function (o) {
	  $.getJSON(o.transaction.url, function (o) {
	    vm.transactions.push(o);
	  });
	});
      });
    };

    ko.applyBindings(vm, document.getElementById('transactions'));
    ko.applyBindings(form_vm, document.getElementById('modal-associate'));
  }

  init_on_page('transactions', init);
})();
