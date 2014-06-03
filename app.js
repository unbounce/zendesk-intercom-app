(function() {

  String.prototype.toTitleCase = function(){
    var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

    return this.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title){
      if (index > 0 && index + match.length !== title.length &&
        match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
        (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
        title.charAt(index - 1).search(/[^\s-]/) < 0) {
        return match.toLowerCase();
      }

      if (match.substr(1).search(/[A-Z]|\../) > -1) {
        return match;
      }

      return match.charAt(0).toUpperCase() + match.substr(1);
    });
  };

  return {

    requests: {

    getUser: function () {
      return {
        url: 'https://{{setting.intercomAppID}}:{{setting.intercomAPIKey}}@api.intercom.io/v1/users/?email=' + this.ticket().requester().email(),
        type: 'GET',
        dataType: 'json',
        secure: true
      };
    }

    },

    events: {
      'app.activated': function() {
        // Show the default button
        this.switchTo('account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?email=' + this.ticket().requester().email(),
          name: this.ticket().requester().name(),
          metadata: []
        });

        // Make the API call (debug)
        this.ajax('getUser');
      },

      'getUser.done': function(data) {
        if (!data.user_id) return false;
        console.log(data);

        // Metadata fields to grab from Intercom
        var fields = ['marketer', 'pages', 'domains', 'clients', 'api keys',
          'session_count'];

        // Store those fields in array
        var metadata = [];
        for ( var i = 0 ; i < fields.length ; i ++ ){
          if ( data.custom_data[ fields[i] ] || data.custom_data[ fields[i] ] === 0 ) {

            // Custom data displays
            if ( fields[i] === 'pages' ) {
              data.custom_data[ fields[i] ] = data.custom_data[ fields[i] ] + ' (' + data.custom_data['published pages'] + ' published)';
            }

            if ( fields[i] === 'marketer' ) {
              data.custom_data[ fields[i] ] = data.custom_data[ fields[i] ].toTitleCase();
            }

            metadata.push({
              field : fields[i].replace(/_/g, ' ').toTitleCase(),
              data : data.custom_data[ fields[i] ]
            });
          }
        }

        // Show the button and data
        this.switchTo('account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?user_id=' + data.user_id,
          name: data.name,
          metadata: metadata
        });
      },

      'getUser.fail': function() {
        // Show the 'no account' message
        this.switchTo('no-account', {
          link: 'https://app.intercom.io/a/apps/' + this.setting('intercomAppID') + '/users/segments/active',
          email: this.ticket().requester().email()
        });
      }
    },

  };

}());
