class CreateRuleCacheClearEvents < ActiveRecord::Migration
  def change
    create_table :rule_cache_clear_events do |t|
      t.references :event, index: true
    end
  end
end
