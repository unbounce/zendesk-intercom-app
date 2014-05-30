(function() {

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
        this.switchTo('button', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?email=' + this.ticket().requester().email(),
          name: this.ticket().requester().name()
        });

        // Make the API call (debug)
        this.ajax('getUser');
      },

      'getUser.done': function(data) {
        if (!data.user_id) return false;
        // Show the button
        this.switchTo('button', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?user_id=' + data.user_id,
          name: data.name
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
