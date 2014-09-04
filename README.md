# Intercom App for Zendesk

A [Zendesk](http://www.zendesk.com) app (widget) that links to the ticket requester's [Intercom.io](http://intercom.io) profile and displays their name, metadata (custom attributes), segments, and tags.

## Build and deploy

1. Edit `app.js` and add the Intercom custom attributes you wish to display, around line 28.

2. Create a ZIP archive of the app files. You can automate this by running:
    ```shell
    npm install -g grunt-cli
    npm install
    grunt
    ```

3. In Zendesk, create a new app and upload the ZIP. ([See these instructions from Zendesk.](http://developer.zendesk.com/documentation/apps/uploading.html) You'll need to be an admin on your Zendesk account.)

4. Click the gear next to the app and click `Change Settings`.
5. Enter your Intercom app ID and API key. Zendesk stores the key securely — it isn't visible in AJAX calls, and can only be seen on this screen by Zendesk admins.

Enjoy!
