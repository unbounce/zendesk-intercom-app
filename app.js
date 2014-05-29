(function() {

  return {

    events: {
      'app.activated': 'showButton'
    },

    showButton: function() {
      var user = this.currentUser();
      this.switchTo('button', {
        intercomAppID: this.setting('intercomAppID'),
        email: this.ticket().requester().email(),
        name: this.ticket().requester().name()
      });

    }

  };

}());
