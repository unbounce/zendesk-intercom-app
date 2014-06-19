(function() {

  String.prototype.toTitleCase = function() {
    var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;
    return this.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title){
      if (index > 0 && index + match.length !== title.length &&
        match.search(smallWords) > -1 && title.charAt(index - 2) !== ':' &&
        (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
        title.charAt(index - 1).search(/[^\s-]/) < 0) {
        return match.toLowerCase();
      }
      if (match.substr(1).search(/[A-Z]|\../) > -1) return match;
      return match.charAt(0).toUpperCase() + match.substr(1);
    });
  };

  function IntercomApp(zendeskApp) {

    // Endpoints
    this.apiRoot = 'https://{{setting.intercomAppID}}:{{setting.intercomAPIKey}}@api.intercom.io';
    this.linkRoot = 'https://app.intercom.io/apps/' + zendeskApp.setting('intercomAppID') + '/users';

    // Default user data – used until actual data is returned from Intercom
    this.user = {
      userID: '',
      name: zendeskApp.ticket().requester().name(),
      email: zendeskApp.ticket().requester().email(),
      link: this.linkRoot + '/show?email=' + zendeskApp.ticket().requester().email(),
      tags: [],
      segments: [],
      metadata: []
    };
  }

  IntercomApp.prototype.filterMetadata = function(data){
    // Intercom metadata fields to display
    var fields = ['phone', 'marketer', 'pages', 'domains', 'clients',
                  'api keys'];

    // Store those fields in array
    var metadata = [];
    _.each(fields, function(field){
      if ( data[field] || data[field] === 0 ) {

        // Custom field displays
        if ( field === 'pages' ) field = field + ' (' + data['published pages'] + ' published)';
        if ( fields === 'marketer' ) field = field.toTitleCase();

        metadata.push({
          field : field.replace(/_/g, ' ').toTitleCase(),
          data : data[fields]
        });
      }
    });
    return metadata;
  };

  return {

    requests: {  // API call parameters
      
      getUser: function () {
        return {
          url: this.app.apiRoot + '/users/?email=' + this.ticket().requester().email(),
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      },

      getAllTags: function() {
        return {
          url: this.app.apiRoot + '/tags',
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      },

      getAllSegments: function() {
        return {
          url: this.app.apiRoot + '/segments',
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      }

    },

    events: {
      
      'app.activated': function() { // Runs on load
        this.app = new IntercomApp(this);
        this.switchTo('account', { app: this.app });

        // Make the API calls
        this.ajax('getUser');
        this.ajax('getAllTags');
        this.ajax('getAllSegments');
      },

      'getUser.done': function(user) {
        this.app.user = {
          userID: user.user_id,
          name: user.name,
          email: user.email,
          tags: user.tags.tags,
          segments: user.segments.segments,
          metadata: this.app.filterMetadata(user.custom_attributes)
        };
        this.trigger('oneCallDone');
      },

      'getAllTags.done': function(tags) {
        this.app.tags = tags.tags || [];
        this.trigger('oneCallDone');
      },

      'getAllSegments.done': function(segments) {
        this.app.segments = segments.segments || [];
        this.trigger('oneCallDone');
      },

      'oneCallDone': function() {
        if ( this.app.user.userID && this.app.tags && this.app.segments)
          this.trigger('allCallsDone');
      },
      
      'allCallsDone': function() {
        // Callback when *all* Ajax requests are complete
        
        var self = this;

        // Get tag names
        _.each(this.app.user.tags, function(userTag) {
          var globalTag = _.find(self.app.tags, function(tag){
            return tag.id === userTag.id;
          });
          if ( globalTag ) userTag.name = globalTag.name;
        });

        // Filter out tags that weren't present on the global tag list
        this.app.user.tags = _.filter(this.app.user.tags, function(tag){
          return typeof tag.name !== 'undefined';
        });

        // Get segment names
        _.each(this.app.user.segments, function(userSegment, key) {
          var globalSegment = _.find(self.app.segments, function(segment){
            return segment.id === userSegment.id;
          });
          if ( globalSegment ) userSegment.name = globalSegment.name;
        });

        // Filter out segments that weren't present on the global segment list
        this.app.user.segments = _.filter(this.app.user.segments, function(segment){
          return typeof segment.name !== 'undefined';
        });

        console.log( this.app );
        this.switchTo('account', { app: this.app });
      },

      'getUser.fail': function() {
        // Show the 'no account' message and search box
        this.app.user.link = this.app.linkRoot + '/segments/active';
        this.switchTo('no-account', { app: this.app });
      },
    }

  };

}());
