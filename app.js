(function() {

  String.prototype.toTitleCase = function() {
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

    data: {},
    apiRoot: 'https://{{setting.intercomAppID}}:{{setting.intercomAPIKey}}@api.intercom.io',

    filterMetadata: function(data){
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
    },

    requests: {

      getUser: function () {
        return {
          url: this.apiRoot + '/users/?email=' + this.ticket().requester().email(),
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      },

      getAllTags: function() {
        return {
          url: this.apiRoot + '/tags',
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      },

      getAllSegments: function() {
        return {
          url: this.apiRoot + '/segments',
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      }

    },

    events: {
      'app.activated': function() {
        // Show the default button straightaway
        this.switchTo('account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?email=' + this.ticket().requester().email(),
          data: {
            user: {
              name: this.ticket().requester().name(),
              tags: [],
              segments: [],
              metadata: []
            }
        }
        });

        // Make the API calls
        this.ajax('getUser');
        this.ajax('getAllTags');
        this.ajax('getAllSegments');
      },

      'getUser.done': function(user) {
        this.data.user = {};
        this.data.user.name = user.name;
        this.data.user.user_id = user.user_id;
        this.data.user.tags = user.tags.tags;
        this.data.user.segments = user.segments.segments;
        this.data.user.metadata = this.filterMetadata(user.custom_attributes);
        if ( this.data.tags && this.data.segments ) this.trigger('allCallsDone');
      },

      'getAllTags.done': function(tags) {
        this.data.tags = tags.tags || [];
        if ( this.data.user && this.data.segments ) this.trigger('allCallsDone');
      },

      'getAllSegments.done': function(segments) {
        this.data.segments = segments.segments || [];
        if ( this.data.user && this.data.tags ) this.trigger('allCallsDone');
      },

      'allCallsDone': function() {
        if ( !this.data.user || !this.data.tags || !this.data.segments ) return false;
        // Callback when all Ajax requests are complete

        // Loop through user's tags
        var that = this;
        _.each(this.data.user.tags, function(userTag) {

          // Get tag name
          var tagName = _.find(that.data.tags, function(tag){
            return tag.id === userTag.id;
          }).name;
          userTag.name = tagName;

          // Get Intercom link
          userTag.link = 'https://app.intercom.io/apps/eqe7kbcu/users/?search=tag:' + encodeURI(tagName);
        });

        // Loop through user's segments
        _.each(this.data.user.segments, function(userSegment, key) {

          // Get Intercom link
          userSegment.link = 'https://app.intercom.io/apps/eqe7kbcu/users/?active_segment=' + userSegment.id;

          // Get segment name
          var segmentName = _.find(that.data.segments, function(segment){
            return segment.id === userSegment.id;
          });
          if ( segmentName ) userSegment.name = segmentName.name;
        });
        this.data.user.segments = _.filter(this.data.user.segments, function(segment){
          return typeof segment.name !== 'undefined';
        });

        console.log('Data from Intercom:', this.data );

        this.switchTo('account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?user_id=' + this.data.user.user_id,
          data: this.data
        });
      },

      'getUser.fail': function() {
        // Show the 'no account' message and search box
        this.switchTo('no-account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/segments/active',
          data: {
            user: {
              email: this.ticket().requester().email(),
              name: this.ticket().requester().name()
            }
          }
        });
      },
    }

  };

}());
