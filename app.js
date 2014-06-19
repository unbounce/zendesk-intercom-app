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

      if (match.substr(1).search(/[A-Z]|\../) > -1) {
        return match;
      }

      return match.charAt(0).toUpperCase() + match.substr(1);
    });
  };

  function IntercomApp(zendeskApp) {

    // Endpoints
    this.apiRoot = 'https://{{setting.intercomAppID}}:{{setting.intercomAPIKey}}@api.intercom.io';
    this.linkRoot = 'https://app.intercom.io/apps/' + zendeskApp.setting('intercomAppID') + '/users';

    // Default user data, until data is returned from the Intercom API
    this.user = {
      userID: '',
      email: zendeskApp.ticket().requester().email(),
      name: zendeskApp.ticket().requester().name(),
      link: this.linkRoot + '/show?email=' + zendeskApp.ticket().requester().email(),
      tags: [],
      segments: [],
      metadata: []
    };
  }

  IntercomApp.prototype.filterMetadata = function(data){
    // Metadata fields to grab from Intercom
    var fields = ['phone', 'marketer', 'pages', 'domains', 'clients',
                  'api keys'];

    // Store those fields in array
    var metadata = [];
    for ( var i = 0 ; i < fields.length ; i ++ ){
      if ( data[ fields[i] ] || data[ fields[i] ] === 0 ){

        // Custom data displays
        if ( fields[i] === 'pages' ) {
          data[ fields[i] ] = data[ fields[i] ] +
                              ' (' + data['published pages'] + ' published)';
        }

        if ( fields[i] === 'marketer' ) {
          data[ fields[i] ] = data[ fields[i] ].toTitleCase();
        }

        metadata.push({
          field : fields[i].replace(/_/g, ' ').toTitleCase(),
          data : data[ fields[i] ]
        });
      }
    }
    return metadata;
  };

  return {

    requests: {

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
      'app.activated': function() {

        this.app = new IntercomApp(this);

        // Show the default button straightaway
        this.switchTo('account', { app: this.app });

        // Make the API calls
        this.ajax('getUser');
        this.ajax('getAllTags');
        this.ajax('getAllSegments');
      },

      'getUser.done': function(user) {
        this.app.user = {
          name: user.name,
          email: user.email,
          userID: user.user_id,
          tags: user.tags.tags,
          segments: user.segments.segments,
          metadata: this.app.filterMetadata(user.custom_attributes)
        };
        if ( this.app.tags && this.app.segments ) this.trigger('allCallsDone');
      },

      'getAllTags.done': function(tags) {
        this.app.tags = tags.tags || [];
        if ( this.app.user.userID && this.app.segments ) this.trigger('allCallsDone');
      },

      'getAllSegments.done': function(segments) {
        this.app.segments = segments.segments || [];
        if ( this.app.user.userID && this.app.tags ) this.trigger('allCallsDone');
      },

      // Callback when *all* Ajax requests are complete
      'allCallsDone': function() {
        var that = this;

        // Loop through user's tags
        _.each(this.app.user.tags, function(userTag) {

          // Get tag name
          var tagName = _.find(that.app.tags, function(tag){
            return tag.id === userTag.id;
          }).name;
          userTag.name = tagName;

        });

        // Filter out tags that weren't present on the global segment list
        this.app.user.tags = _.filter(this.app.user.tags, function(tag){
          return typeof tag.name !== 'undefined';
        });

        // Loop through user's segments
        _.each(this.app.user.segments, function(userSegment, key) {

          // Get segment name
          var segmentName = _.find(that.app.segments, function(segment){
            return segment.id === userSegment.id;
          });
          if ( segmentName ) userSegment.name = segmentName.name;
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
        console.log('No Intercom user found');
        this.app.user.link = this.app.linkRoot + '/segments/active';
        this.switchTo('no-account', { app: this.app });
      },
    }

  };

}());
