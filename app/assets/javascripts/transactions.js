(function () {
  function init() {
    var styles = {
      'open' : 'panel-success',
      'closed' : 'panel-info'
    };

    var documents_cache = _.map(documents, function (o) {
      return {
	id: o.id,
	content: ko.observable()
      };
    });

    function with_document_content(id, fn) {
      var o = _.find(documents_cache, function (doc) {
	return id === doc.id;
      });

      var content = ko.observable();
      if (o) {
	content = o.content;
      } else {
	documents_cache.push({ id: id, content: content });
      }
      fn(content);
    }

    var page_vm = {
      transactions: ko.observableArray(transactions),
      invoices: ko.observableArray(invoices),
      modals: {
	associate: {
	  rules: ko.observableArray(rules),
	  transformations: ko.observableArray(transformations),
	  rule_id: ko.observable(),
	  transformation_id: ko.observable()
	},
	add_invoice: {
	  url: ko.observable('https://raw.githubusercontent.com/Xalgorithms/xa-elegans/master/ubl/documents/icelandic-guitar/t0.xml')
	}
      }
    };

    function send_event(t, args, fn) {
      var evt = {
	event_type: t,
	payload: args
      };
      $.post(Routes.api_v1_events_path(), evt, function (o) {
	$.getJSON(o.url, function (e) {
	  if (fn) {
	    fn(e);
	  } else {
	    console.log(e);
	  }
	});
      });
    }

    function recycle_transaction(id, url, fn) {
      var otr = _.find(page_vm.transactions(), function (o) {
	return o.id === id;
      });

      if (otr) {
	$.getJSON(url, function (ntr) {
	  page_vm.transactions.replace(otr, ntr);
	  fn();
	});
      }
    }

    function make_invoice_vm(invoice) {
      var vm = {
	id: invoice.id,
	content: ko.computed(function () {
	  var rv = null;
	  if (invoice) {
	    var last = _.last(invoice.revisions);
	    if (last) {
	      with_document_content(last.document.id, function (content) {
		rv = content();
	      });
	    }
	  }

	  return rv;
	})
      };

      vm.destroy = function () {
	send_event('invoice_destroy', { invoice_id: invoice.id }, function () {
	  page_vm.invoices.remove(function (o) {
	    return o.id === invoice.id;
	  });
	});
      };

      vm.format_url = ko.computed(function () {
	return invoice ? Routes.api_v1_invoice_path(invoice.id) : '';
      });
      
      return vm;
    }

    function make_association_vm(o) {
      return o;
    }
    
    function make_item_vm(tr) {
      var vm = {
	panel_style: _.get(styles, tr.status, 'panel-info'),
	status_label: _.get(labels, tr.status),
	// overrides of base properties
	invoices: ko.computed(function () {
	  var all_invoices = page_vm.invoices();

	  return _.reduce(tr.invoices, function (a, o) {
	    var invoice_vm = _.find(all_invoices, function (invoice) {
	      return o.id === invoice.id;
	    });

	    var rv = invoice_vm ? _.concat(a, make_invoice_vm(invoice_vm)) : a;
	    return rv;
	  }, []);
	}),
	associations: ko.observableArray(_.map(tr.associations, make_association_vm)),
	source: ko.observable(tr.source)
      };

      vm.have_invoices = ko.computed(function () {
	return vm.invoices().length > 0;
      });

      vm.have_associations = ko.computed(function () {
	return vm.associations().length > 0;
      });

      // triggers
      vm.trigger_associate = function (o) {
	$('#modal-associate').modal('toggle');
	page_vm.modals.associate.transaction_id = tr.id;
      };
      
      vm.trigger_execute = function (o) {
	send_event('transaction_execute', { transaction_id: tr.id });
      };
      
      vm.trigger_close = function (o) {
	send_event('transaction_close', { transaction_id: tr.id }, function (e) {
	  recycle_transaction(e.transaction.id, e.transaction.url);
	});
      };
      
      vm.trigger_add_invoice = function (o) {
	$('#modal-add-invoice').modal('toggle');
	page_vm.modals.add_invoice.transaction_id = tr.id;
      };
      
      vm.trigger_bind_source = function (o) {
	debugger;
      };
      
      vm.trigger_tradeshift_sync = function (o) {
	send_event('tradeshift_sync', { user_id: user_id });
      };

      return vm;
    }

    page_vm.send_association = function () {
      $('#modal-associate').modal('toggle');
      var m = page_vm.modals.associate;
      send_event('transaction_associate_rule', {
	transaction_id: m.transaction_id,
	rule_id: m.rule_id(),
	transformation_id: m.transformation_id()
      }, function (e) {
	recycle_transaction(e.transaction.id, e.transaction.url);
      });
    };

    page_vm.send_add_invoice = function () {
      $('#modal-add-invoice').modal('toggle');
      var m = page_vm.modals.add_invoice;
      send_event('transaction_add_invoice', {
	transaction_id: m.transaction_id,
	url: m.url()
      }, function (e) {
	recycle_transaction(e.transaction.id, e.transaction.url, function () {
	  $.getJSON(e.invoice.url, function (invoice) {
	    page_vm.invoices.push(invoice);
	  });
	  $.getJSON(e.document.url, function (content) {
	    with_document_content(e.document.id, function (doc_content) {
	      doc_content(content);
	    });
	  });
	});
      });
    };
    
    page_vm.transaction_parts = ko.computed(function () {
      return _.chunk(_.map(page_vm.transactions(), make_item_vm), 2);
    });

    page_vm.add = function () {
      $.post(Routes.api_v1_events_path(), {
	event_type: 'transaction_open',
	payload: { user_id: user_id }
      }, function (resp) {
	$.getJSON(resp.url, function (o) {
	  $.getJSON(o.transaction.url, function (o) {
	    page_vm.transactions.push(o);
	  });
	});
      });
    };

    // download associated objects
    _.each(documents, function (document) {
      $.getJSON(document.url, function (content) {
	with_document_content(document.id, function (doc_content) {
	  doc_content(content);
	});
      });
    });

    ko.applyBindings(page_vm, document.getElementById('page'));    
  }

  init_on_page('transactions', init);
})();
