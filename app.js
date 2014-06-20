(function() {

  String.prototype.toTitleCase = function() {
    var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;
    return this.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title) {
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

  function IntercomApp(zd) {
    this.zd = zd;
    this.user = {};

    // Endpoints
    this.apiRoot = 'https://{{setting.intercomAppID}}:{{setting.intercomAPIKey}}@api.intercom.io';
    this.linkRoot = 'https://app.intercom.io/apps/' + zd.setting('intercomAppID') + '/users';
  }

  IntercomApp.prototype.ajaxParams = function(url) {
    return {
      url: this.apiRoot + url,
      type: 'GET',
      dataType: 'json',
      secure: true
    };
  };

  IntercomApp.prototype.addTag = function(newTagID) {
    if ( this.alreadyHasTag(newTagID) ) {
      this.addTagCleanup();
      return services.notify(this.user.name + ' already has the tag \'' +
              this.getTagName(newTagID) + '\'.', 'error');
    }

    this.user.newTagID = newTagID;
    this.zd.ajax('addTagRequest');
  };

  IntercomApp.prototype.filterMetadata = function(data) {
    // Intercom metadata fields to display
    var fields = ['phone', 'marketer', 'current LP solution', 'pages', 'domains',
                    'clients', 'api keys'];

    // Store those fields in array
    var metadata = [];
    _.each(fields, function(field) {
      var value = data[field];
      if ( value || value === 0 ) {

        // Custom field displays
        if ( field === 'pages' ) value = value + ' (' + data['published pages'] + ' published)';
        if ( field === 'marketer' ) value = value.toTitleCase();

        metadata.push({
          field: field.replace(/_/g, ' ').toTitleCase(),
          value: value
        });
      }
    });
    return metadata;
  };

  IntercomApp.prototype.getTagName = function(searchID) {
    var globalTag = _.find(this.tags, function(tag) {
      return parseInt(tag.id, 10) === parseInt(searchID, 10);
    });
    if ( globalTag ) return globalTag.name;
    else return null;
  };

  IntercomApp.prototype.getTagID = function(searchName) {
    var globalTag = _.find(this.tags, function(tag) {
      return tag.name.toLowerCase() === searchName.toLowerCase();
    });
    if ( globalTag ) return globalTag.id;
    else return null;
  };

  IntercomApp.prototype.alreadyHasTag = function(searchID) {
    var userTag = _.find(this.user.tags, function(tag) {
      return parseInt(tag.id, 10) === parseInt(searchID, 10);
    });
    return typeof userTag !== 'undefined';
  };

  IntercomApp.prototype.addTagCleanup = function() {
    this.zd.$('#new-tag').val('none');
    delete this.user.newTagID;
  };

  return {

    requests: {  // API call parameters

      getUserRequest: function() {
        return this.app.ajaxParams( '/users/?email=' + this.app.user.email );
      },

      getTagsRequest: function() {
        return this.app.ajaxParams( '/tags' );
      },

      getSegmentsRequest: function() {
        return this.app.ajaxParams( '/segments' );
      },

      addTagRequest: function() {
        if ( this.app.user.newTagID ) return {
          url: this.app.apiRoot + '/tags',
          type: 'POST',
          dataType: 'json',
          contentType: 'application/json',
          secure: true,
          data: JSON.stringify({
            id: this.app.user.newTagID,
            users: [ { user_id: this.app.user.userID } ]
          })
        };
      }

    },

    events: {

      'app.activated': function() {
        // Runs on load. Instantiate our object and show our default view
        this.app = new IntercomApp(this);
        this.trigger('init');
      },

      'init': function() {
        var user;

        if ( typeof this.ticket === 'function' ) user = this.ticket().requester();
        else if ( typeof this.user === 'function' ) user = this.user();

        this.app.user.name = user.name() || '';
        this.app.user.email = user.email();

        if ( this.app.user.email ) {
          this.switchTo('account', { app: this.app });

          // Make the API calls asynchronously
          this.ajax('getUserRequest');
          this.ajax('getTagsRequest');
          this.ajax('getSegmentsRequest');
        } else {
          this.switchTo('no-account', { app: this.app } );
        }
      },

      'ticket.requester.email.changed': function() {
        this.trigger('init');
      },

      'getUserRequest.done': function(user) {
        this.app.user = {
          userID: user.user_id,
          name: user.name.toTitleCase(),
          email: user.email,
          tags: user.tags.tags,
          segments: user.segments.segments,
          metadata: this.app.filterMetadata(user.custom_attributes)
        };
        this.trigger('requestDone');
      },

      'getTagsRequest.done': function(tags) {
        this.app.tags = tags.tags || [];
        this.trigger('requestDone');
      },

      'getSegmentsRequest.done': function(segments) {
        this.app.segments = segments.segments || [];
        this.trigger('requestDone');
      },

      'requestDone': function() {
        if ( !this.app.user.userID || !this.app.tags || !this.app.segments ) return false;

        // Callback when *all* Ajax requests are complete
        var self = this;

        // Add tag names to user tags array
        _.each(this.app.user.tags, function(userTag) {
          userTag.name = self.app.getTagName(userTag.id);
        });

        // Filter out tags that weren't present on the global tag list
        this.app.user.tags = _.filter(this.app.user.tags, function(tag) {
          return typeof tag.name === 'string';
        });

        // Add segment names to user segments array
        _.each(this.app.user.segments, function(userSegment, key) {
          var globalSegment = _.find(self.app.segments, function(segment) {
            return segment.id === userSegment.id;
          });
          if ( globalSegment ) userSegment.name = globalSegment.name;
        });

        // Filter out segments that weren't present on the global segment list
        this.app.user.segments = _.filter(this.app.user.segments, function(segment) {
          return typeof segment.name !== 'undefined';
        });

        console.log( this.app );

        this.switchTo('account', { app: this.app });
      },

      'getUserRequest.fail': function() {
        // Show the 'no account' message and search box
        this.switchTo('no-account', { app: this.app });
      },

      'ticket.custom_field_21359544.changed': function(data) {
        // Fires when the 'Feature Interest' field is changed
        var newFeatureInterest = this.ticket().customField('custom_field_21359544').replace(/feature_request_/, '').replace(/_/g, ' ');
        var newTagName = 'Product - Feature Interest - ' + newFeatureInterest;
        var newTagID = this.app.getTagID(newTagName);

        if ( ! this.app.user.userID )
          return services.notify('Intercom tag will not be tagged because ' +
                                  'the requester was not found on Intercom.',
                                  'alert');

        if ( !newTagID )
          return services.notify('Intercom user ' + this.app.user.name + ' ' +
                                  'will not be tagged because there is no tag ' +
                                  'called \'' + newTagName + '\'.', 'alert');

        this.app.addTag(newTagID);
      },

      'change #new-tag': function() {
        var newTagID = this.$('#new-tag').val();
        this.app.addTag(newTagID);
      },

      'addTagRequest.done': function(data) {
        console.log('Adding tag returned', data);

        this.app.addTagCleanup();

        // Fail
        if ( data.errors || typeof data !== 'object' )
          return this.trigger('addTagRequest.fail');

        // Success
        services.notify('Added tag \'' + data.name + '\' to ' +
                        this.app.user.name + '.');
        this.app.user.tags.push( data );
        this.switchTo('account', { app: this.app }); // Refresh the view
      },

      'addTagRequest.fail': function() {
        services.notify('Failed to add tag \'' +
                        this.app.getTagName(this.app.user.newTagID) +
                        '\' to ' + this.app.user.name + '.', 'error');
        this.app.addTagCleanup();
      }
    }

  };

}());
