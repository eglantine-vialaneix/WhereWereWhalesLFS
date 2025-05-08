// # Inspired by https://github.com/roshanpal/Circular-Time-Range-Picker-jQuery

(function ($, window, document) {
    var pluginName = 'circle_datepicker';
  
    var defaults = {
      start: 0,
      end: 11,
      step: 30,
      width: 180,
      height: 180,
      step_mins: 30
    };
  
    function polar_to_cartesian(cx, cy, radius, angle) {
        // Normalize the angle to always be within the range 0 to 360
        angle = (angle + 360) % 360;  // Normalize negative angles
    
        // Convert to radians and calculate the x, y coordinates
        var radians = (angle - 90) * Math.PI / 180.0;
        var x = Math.round((cx + (radius * Math.cos(radians))) * 100) / 100;
        var y = Math.round((cy + (radius * Math.sin(radians))) * 100) / 100;
    
        // Return the coordinates for placement
        return [x, y];
    }
  
    function svg_arc_path(x, y, radius, range) {
      var start_xy = polar_to_cartesian(x, y, radius, range[1]);
      var end_xy = polar_to_cartesian(x, y, radius, range[0]);
      var difference = range[1] - range[0];
      var long = difference < 0 ? (difference >= -180 ? 1 : 0) : (difference >= 180 ? 1 : 0);
      return `M ${start_xy[0]} ${start_xy[1]} A ${radius} ${radius} 0 ${long} 0 ${end_xy[0]} ${end_xy[1]}`;
    }
  
    function angle_from_point(width, height, x, y) {
      return -Math.atan2(width / 2 - x, height / 2 - y) * 180 / Math.PI;
    }
  
    function time_to_angle(time) {
      return (time - 6) * 360 / 12 - 180;
    }
  
    function timerange_to_angle(timeRange) {
      return [time_to_angle(timeRange[0]), time_to_angle(timeRange[1])];
    }
  
    function angle_to_time(angle, step_mins) {
        // Normalize the angle to a 0-360 range
        angle = (angle + 360) % 360;
        const index = Math.floor(angle / 30);

        return index;
    }
  
    function CircleDatepicker(element, options) {
      this.$el = $(element);
      this.options = $.extend({}, defaults, options);
      this.$path = this.options.path_el ? $(this.options.path_el) : this.$el.find('.circle-datepicker__path');
      this.$start = this.options.start_el ? $(this.options.start_el) : this.$el.find('.circle-datepicker__start');
      this.$end = this.options.end_el ? $(this.options.end_el) : this.$el.find('.circle-datepicker__end');
      this.value = timerange_to_angle([this.options.start, this.options.end]);
      this.pressed = null;
      this.oldValues = [];
      this.angle = null;
      this.init();
    }
  
    CircleDatepicker.prototype.init = function () {
      var _this = this;
  
      this.draw();
  
      ['path', 'start', 'end'].forEach(function (el) {
        $(_this['$' + el]).on('mousedown', function (e) {
          this.elMouseDown(e, el);
        }.bind(_this));
      });
  
      $(document).on('mouseup', function () {
        if (_this.pressed) {
            _this.triggerStop();  // Custom method to trigger 'slidestop'
        }
        _this.pressed = null;
    });
    
  
      $(document).on('mousemove', _this.docMouseMove.bind(_this));
    };
  
    CircleDatepicker.prototype.elMouseDown = function (e, el) {
      this.angle = angle_from_point(this.options.width, this.options.height, e.pageX - this.$el.offset().left, e.pageY - this.$el.offset().top);
      this.oldValues = [this.value[0], this.value[1]];
      this.pressed = el;
    };
  
    CircleDatepicker.prototype.docMouseMove = function (e) {
        if (this.pressed) {
            var diff = this.angle - angle_from_point(this.options.width, this.options.height, e.pageX - this.$el.offset().left, e.pageY - this.$el.offset().top);
        
            if (this.pressed === 'path') {
                this.value = [this.oldValues[0] - diff, this.oldValues[1] - diff];
            } else if (this.pressed === 'start') {
                this.value[0] = this.oldValues[0] - diff;
              } else if (this.pressed === 'end') {
                this.value[1] = this.oldValues[1] - diff;
              }
              
    
            this.value[0] = (this.value[0] + 360) % 360;
            this.value[1] = (this.value[1] + 360) % 360;

    
            var _this = this;
            requestAnimationFrame(function () {
                _this.draw();
                _this.trigger();
            });
        }
    };
    
  
    CircleDatepicker.prototype.drawCircle = function (el, angle, labelType, start) {
        // Normalize the angle to the 0-360 range
        angle = (angle + 360) % 360;  // Ensure angle is between 0 and 360
        
        var coords = polar_to_cartesian(90, 90, 60, angle);
        el.setAttribute('cx', coords[0]);
        el.setAttribute('cy', coords[1]);
     
        if (labelType) {
          const month = angle_to_month(angle);
          let label;
          if (start) {
            label = document.getElementById('month-label1');
          } else {
            label = document.getElementById('month-label2');
          }
     
          label.setAttribute('x', coords[0]);
          label.setAttribute('y', coords[1] - 20); // position label above the cursor
          label.textContent = month;
          label.setAttribute('visibility', 'visible');
     
        }
      };
     
  
    CircleDatepicker.prototype.draw = function () {
      this.$path.get(0).setAttribute('d', svg_arc_path(90, 90, 60, this.value));
      this.drawCircle(this.$start.get(0), this.value[0], true, true);
      this.drawCircle(this.$end.get(0), this.value[1], true, false);
    };
  
    CircleDatepicker.prototype.trigger = function () {
      this.$el.trigger('change', [[
        angle_to_time(this.value[0], this.options.step_mins),
        angle_to_time(this.value[1], this.options.step_mins),
      ]]);
    };

    CircleDatepicker.prototype.triggerStop = function () {
        this.$el.trigger('slidestop', [[
            angle_to_time(this.value[0], this.options.step_mins),
            angle_to_time(this.value[1], this.options.step_mins)
        ]]);
    };
    
  
    $.fn[pluginName] = function (options) {
      return this.each(function () {
        $.data(this, "plugin_" + pluginName, new CircleDatepicker(this, options));
      });
    };
  
  })(jQuery, window, document);
  
  $(() => {
    $('.circle-datepicker').circle_datepicker({});
  });

  function angle_to_month(angle) {
    // Normalize the angle between 0 and 360
    angle = (angle + 360) % 360;
    // Each month is 30 degrees
    const months = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];

    // Get the month index based on the angle
    const index = Math.floor(angle / 30);

    // Return the month from the array
    return months[index];
}