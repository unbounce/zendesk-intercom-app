module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: ['app.js'],
      options: {
        eqeqeq: true,
        indent: 2,
        latedef: true,
        newcap: true,
        noempty: true,
        nonbsp: true,
        quotmark: 'single',
        trailing: false
      }
    },

    compress: {
      main: {
        options: {
          archive: '<%= pkg.name %>_v<%= pkg.version %>_' + new Date().getTime() +'.zip',
          mode: 'zip'
        },
        files: [
          {
            expand: true,
            src: [
              '**',
              '!package.json',
              '!Gruntfile.js',
              '!*.zip',
              '!node_modules/**'
            ],
            dest: '/'
          }
        ]
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compress');

  grunt.registerTask('default', ['jshint', 'compress']);

};
