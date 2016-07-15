namespace :mongo do
  require 'awesome_print'
  require 'ubl'

  desc 'populate an invoice'
  task :populate_invoice, [:file] => :environment do |t, args|
    if args.file
      include UBL::Invoice
      
      parse_urn(args.file) do |invoice|
        puts "> adding #{args.file} into Mongo on localhost"
        cl = Mongo::Client.new(['127.0.0.1:27017'], database: 'lichen')
        r = cl[:invoices].insert_one(invoice)
        puts "# inserted (doc=#{r.inserted_ids.first})"
      end
    else
      puts "! filename"
    end
  end

  desc 'dump invoices'
  task :invoices, [] => :environment do |t, args|
    cl = Mongo::Client.new(['127.0.0.1:27017'], database: 'lichen')
    cl[:invoices].find.each do |invoice|
      ap invoice
    end
  end

  desc 'drop'
  task :drop, [:collection] => :environment do |t, args|
    cl = Mongo::Client.new(['127.0.0.1:27017'], database: 'lichen')
    if args.collection
      cl[args.collection.to_sym].drop
    else
      puts '! collection'
    end
  end
end