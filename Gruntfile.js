module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Lint
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

    // Delete old ZIP files
    clean: {
      oldBuilds: {
        src: ['<%= pkg.name %>_*.zip']
      }
    },
    
    // Create a new ZIP file
    compress: {
      app: {
        options: {
          archive: '<%= pkg.name %>_v<%= pkg.version %>.zip',
          mode: 'zip'
        },
        files: [
          {
            expand: true,
            src: [
              '**',
              'README.md',
              '!assets/screenshot.png',
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
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');

  grunt.registerTask('default', ['jshint', 'clean', 'compress']);

};
