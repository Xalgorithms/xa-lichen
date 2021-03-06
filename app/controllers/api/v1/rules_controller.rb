module Api
  module V1
    class RulesController < ActionController::Base
      # TODO: do this properly
      skip_before_filter  :verify_authenticity_token

      def index
        RegistryService.sync_rules
        render(json: RuleSerializer.many(Rule.all))
      end
    end
  end
end
