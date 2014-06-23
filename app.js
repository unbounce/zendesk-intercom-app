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
        if ( field === 'marketer' ) value = value.replace(/_/g, ' ').toTitleCase();

        metadata.push({
          field: field.replace(/_/g, ' ').toTitleCase(),
          value: value
        });
      }
    });
    return metadata;
  };

  IntercomApp.prototype.findTag = function(search, attr) {
    // Search for global tags by ID or name
    var result = _.find(this.tags, function(tag) {
      if ( search.id ) return parseInt(tag.id, 10) === parseInt(search.id, 10);
      if ( search.name ) return tag.name.toLowerCase() === search.name.toLowerCase();
    });
    if ( result && result[attr] ) return result[attr];
    else return result;
  };

  IntercomApp.prototype.addTag = function(newTagID) {
    // Check if the user already has this tag
    if ( this.userHasTag(newTagID) ) {
      this.addTagCleanup();

      // Highlight the pre-existing tag
      this.zd.$('#tags dd#tag-' + newTagID).css('background-color', '#F5F5D3');
      var self = this;
      setTimeout(function () {
        self.zd.$('#tags dd#tag-' + newTagID).css('background-color', 'white');
      }, 5000);

      return services.notify(this.user.name + ' already has the tag <b>' +
              this.findTag({id: newTagID}, 'name') + '</b>.',
              'error');
    }

    this.user.newTagID = newTagID;
    this.zd.ajax('addTagRequest');
  };

  IntercomApp.prototype.userHasTag = function(searchID) {
    return typeof _.find(this.user.tags, function(tag) {
      return parseInt(tag.id, 10) === parseInt(searchID, 10);
    }) !== 'undefined';
  };

  IntercomApp.prototype.addTagCleanup = function() {
    this.zd.$('#new-tag').val('none');
    delete this.user.newTagID;
  };

  IntercomApp.prototype.ajaxParamsGET = function(url) {
    return {
      url: this.apiRoot + url,
      type: 'GET',
      dataType: 'json',
      secure: true
    };
  };

  IntercomApp.prototype.ajaxParamsPOST = function(url, data) {
    return {
      url: this.apiRoot + url,
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      secure: true,
      data: JSON.stringify(data)
    };
  };

  return {

    requests: {  // API call parameters

      getUserRequest: function() {
        return this.app.ajaxParamsGET('/users/?email=' + this.app.user.email);
      },

      findTagsRequest: function() {
        return this.app.ajaxParamsGET('/tags');
      },

      getSegmentsRequest: function() {
        return this.app.ajaxParamsGET('/segments');
      },

      addTagRequest: function() {
        return this.app.ajaxParamsPOST('/tags', {
          id: this.app.user.newTagID,
          users: [ { user_id: this.app.user.userID } ]
        });
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

        if ( user && user.email() ) {

          this.app.user.email = user.email();
          if ( user.name() ) this.app.user.name = user.name();

          this.switchTo('account', { app: this.app });

          // Make the API calls asynchronously
          this.ajax('getUserRequest');
          this.ajax('findTagsRequest');
          this.ajax('getSegmentsRequest');
        } else {
          this.switchTo('no-account', { app: this.app } );
        }
      },

      'ticket.requester.email.changed': function() {
        this.trigger('init');
      },

      'ticket.requester.name.changed': function() {
        this.trigger('init');
      },

      'getUserRequest.done': function(user) {
        this.app.user = {
          receivedFromIntercom: true,
          userID: user.user_id,
          name: user.name ? user.name.toTitleCase() : this.app.user.name,
          email: user.email,
          tags: user.tags.tags,
          segments: user.segments.segments,
          metadata: this.app.filterMetadata(user.custom_attributes)
        };
        this.trigger('requestDone');
      },

      'findTagsRequest.done': function(tags) {
        this.app.tags = tags.tags || [];
        this.trigger('requestDone');
      },

      'getSegmentsRequest.done': function(segments) {
        this.app.segments = segments.segments || [];
        this.trigger('requestDone');
      },

      'requestDone': function() {
        if ( !this.app.user.receivedFromIntercom || !this.app.tags ||
             !this.app.segments ) return false;

        // Callback when *all* Ajax requests are complete
        var self = this;

        // Add tag names to user tags array
        _.each(this.app.user.tags, function(userTag) {
          userTag.name = self.app.findTag({id: userTag.id}, 'name') + ' ';
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

      // This will auto-tag the user with a Feature Interest tag whenever a
      // feature is chosen from the 'Feature Interest' custom field dropdown
      //   e.g. selecting 'feature_interest_responsive'
      //   adds tag 'Product - Feature Request - Responsive'
      'ticket.custom_field_21359544.changed': function(data) {

        // Only tag if the feature interest has actually changed
        if ( !data[0] || !this.ticket().customField('custom_field_21359544') )
           return false;

        var newTagName = 'Product - Feature Interest - ' +
                            this.ticket().customField('custom_field_21359544')
                            .replace(/feature_request_/, '').replace(/_/g, ' ');

        // Don't tag if there isn't an associated Intercom user
        if ( !this.app.user.userID )
          return services.notify('User will not be tagged with <b>' +
            newTagName.toTitleCase() + '</b>, because \'' + this.app.user.name +
            '\' was not found on Intercom.<br /><br /><a href="' +
            this.app.linkRoot + '/?search=' + encodeURI(this.app.user.name) + '">' +
            'Click here to search for them.</a>', 'alert');

        // Check whether a corresponding Intercom tag exists
        var newTagID = this.app.findTag({name: newTagName}, 'id');

        if ( !newTagID )
          return services.notify('Intercom user will not be tagged because ' +
            'there is no tag <b>' + newTagName.toTitleCase() + '</b>.' +
            '<br /><br />To add a new tag, <a href="' + this.app.linkRoot +
            '/show?email=' + this.app.user.email + '">go to Intercom</a>.',
            'alert');

        // Tag the user
        this.app.addTag(newTagID);
      },

      'change #new-tag': function() {
        var newTagID = this.$('#new-tag').val();
        this.app.addTag(newTagID);
      },

      'addTagRequest.done': function(data) {
        console.log('Adding tag', data);

        this.app.addTagCleanup();

        // Fail
        if ( data.errors || typeof data !== 'object' )
          return this.trigger('addTagRequest.fail');

        // Success
        services.notify('Added tag <b>' + data.name + '</b> to ' +
                        this.app.user.name + '.');
        this.app.user.tags.push( data );
        this.switchTo('account', { app: this.app }); // Refresh the view
      },

      'addTagRequest.fail': function() {
        var tagName = this.app.findTag({id: this.app.user.newTagID} || '';
        services.notify('Failed to add tag <b>' + tagName + '</b> to ' +
        this.app.user.name + '</b>.', 'error');
        this.app.addTagCleanup();
      }
    }

  };

}());
