/*global Caman: true, exports: true */

/*
 * NodeJS compatibility
 */
if (!Caman && typeof exports == "object") {
	var Caman = {manip:{}};
	exports.plugins = Caman.manip;
}

(function (Caman) {

  var vignetteFilters = {
    brightness: function (rgba, amt, opts) {
      rgba.r = rgba.r - (rgba.r * amt * opts.strength);
      rgba.g = rgba.g - (rgba.g * amt * opts.strength);
      rgba.b = rgba.b - (rgba.b * amt * opts.strength);
      
      return rgba;
    },
    
    gamma: function (rgba, amt, opts) {
      rgba.r = Math.pow(rgba.r / 255, Math.max(10 * amt * opts.strength, 1)) * 255;
      rgba.g = Math.pow(rgba.g / 255, Math.max(10 * amt * opts.strength, 1)) * 255;
      rgba.b = Math.pow(rgba.b / 255, Math.max(10 * amt * opts.strength, 1)) * 255;
      
      return rgba;
    },
    
    colorize: function (rgba, amt, opts) {
      rgba.r -= (rgba.r - opts.color.r) * amt;
      rgba.g -= (rgba.g - opts.color.g) * amt;
      rgba.b -= (rgba.b - opts.color.b) * amt;
      
      return rgba;
    }
  };
  
  /*
   * Legacy vignette function. Creates a circular vignette and uses
   * gamma adjustments to darken.
   *
   * If size is a string and ends with %, its a percentage. Otherwise,
   * its an absolute number of pixels.
   */
  Caman.manip.vignette = function (size, strength) {
    var center, start, end, loc, dist, div, bezier;

    if (typeof size === "string" && size.substr(-1) == "%") {
      if (this.dimensions.height > this.dimensions.width) {
        size = this.dimensions.width * (Number(size.substr(0, size.length - 1)) / 100);
      } else {
        size = this.dimensions.height * (Number(size.substr(0, size.length - 1)) / 100);
      }
    }
    
    if (!strength) {
      strength = 0.6;
    } else {
      strength /= 100;
    }
    
    center = [(this.dimensions.width / 2), (this.dimensions.height / 2)];
    
    // start = darkest part
    start = Math.sqrt(Math.pow(center[0], 2) + Math.pow(center[1], 2)); // corner to center dist
    
    // end = lightest part (0 vignette)
    end = start - size;
    
    bezier = Caman.bezier([0, 1], [30, 30], [70, 60], [100, 80]);
    return this.process({center: center, start: start, end: end, size: size, strength: strength, bezier: bezier}, function vignette(data, rgba) {
      // current pixel coordinates
      loc = this.locationXY();
      
      // distance between center of image and current pixel
      dist = Math.sqrt(Math.pow(loc.x - data.center[0], 2) + Math.pow(loc.y - data.center[1], 2));
      
      if (dist > data.end) {
        // % of vignette
        div = Math.max(1, ((data.bezier[Math.round(((dist - data.end) / data.size) * 100)]/10) * strength));
        
        // Use gamma to adjust the vignette - much better results
        rgba.r = Math.pow(rgba.r / 255, div) * 255;
	      rgba.g = Math.pow(rgba.g / 255, div) * 255;
	      rgba.b = Math.pow(rgba.b / 255, div) * 255;
      }
      
      return rgba;
    });
  };
  
  /*
   * Creates a rectangular vignette with rounded corners of a given radius.
   *
   * Options:
   *    size: width and height of the rectangular region; e.g. {width: 300, height: 400}
   *    strength: how strong should the vignette effect be?; default = 50
   *    cornerRadius: radius of the rounded corners; default = 0
   *    method: brightness, gamma, colorize, blur (not implemented); default = brightness
   *    color: only used if method is colorize; default = #000000
   */
  Caman.manip.rectangularVignette = function (opts) {
    var defaults = {
      strength: 50,
      cornerRadius: 0,
      method: 'brightness',
      color: {r: 0, g: 0, b: 0}
    };
    
    opts = Caman.extend(defaults, opts);
    
    if (!opts.size) {
      return this;
    } else if (typeof opts.size === "string") {
      // Percentage
      var percent = parseInt(opts.size, 10) / 100;
      opts.size = {
        width: this.dimensions.width * percent,
        height: this.dimensions.height * percent
      };
    } else if (typeof opts.size === "object") {
      if (typeof opts.size.width === "string") {
        opts.size.width = this.dimensions.width * (parseInt(opts.size.width, 10) / 100);
      }
      
      if (typeof opts.size.height === "string") {
        opts.size.height = this.dimensions.height * (parseInt(opts.size.height, 10) / 100);
      }
    } else if (typeof opts.size === "number") {
      var size = opts.size;
      opts.size = {
        width: size,
        height: size
      };
    }
    
    if (typeof opts.cornerRadius === "string") {
      // Variable corner radius
      opts.cornerRadius = (opts.size.width / 2) * (parseInt(opts.cornerRadius, 10) / 100);
    }
    
    opts.strength /= 100;
    
    // Since pixels are discreet, force size to be an int
    opts.size.width = Math.floor(opts.size.width);
    opts.size.height = Math.floor(opts.size.height);
    opts.image = {
      width: this.dimensions.width,
      height: this.dimensions.height
    };
    
    if (opts.method == "colorize" && typeof opts.color === "string") {
      opts.color = Caman.hex_to_rgb(opts.color);
    }
    
    // Generate useful rectangle dimensions
    opts.coords = {};
    opts.coords.left = (this.dimensions.width - opts.size.width) / 2;
    opts.coords.right = this.dimensions.width - opts.coords.left;
    opts.coords.bottom = (this.dimensions.height - opts.size.height) / 2;
    opts.coords.top = this.dimensions.height - opts.coords.bottom;
    
    // Important rounded corner info
    // Order is top left corner moving clockwise around rectangle
    opts.corners = [
      {x: opts.coords.left + opts.cornerRadius, y: opts.coords.top - opts.cornerRadius},
      {x: opts.coords.right - opts.cornerRadius, y: opts.coords.top - opts.cornerRadius},
      {x: opts.coords.right - opts.cornerRadius, y: opts.coords.bottom + opts.cornerRadius},
      {x: opts.coords.left + opts.cornerRadius, y: opts.coords.bottom + opts.cornerRadius}
    ];
    
    opts.maxDist = Caman.distance(0, 0, opts.corners[3].x, opts.corners[3].y) - opts.cornerRadius;

    var loc, amt, radialDist;
    return this.process(opts, function rectangularVignette (opts, rgba) {
      loc = this.locationXY();

      // Trivial rejects
      if ((loc.x > opts.corners[0].x && loc.x < opts.corners[1].x) && (loc.y > opts.coords.bottom && loc.y < opts.coords.top)) {
        return rgba;
      } else if ((loc.x > opts.coords.left && loc.x < opts.coords.right) && (loc.y > opts.corners[3].y && loc.y < opts.corners[2].y)) {
        return rgba;
      }
      
      // Need to figure out which section we're in. First, the trivial ones:
      if (loc.x > opts.corners[0].x && loc.x < opts.corners[1].x && loc.y > opts.coords.top) {
        // top-middle section
        amt = (loc.y - opts.coords.top) / opts.maxDist;
      } else if (loc.y > opts.corners[2].y && loc.y < opts.corners[1].y && loc.x > opts.coords.right) {
        // right-middle section
        amt = (loc.x - opts.coords.right) / opts.maxDist;
      } else if (loc.x > opts.corners[0].x && loc.x < opts.corners[1].x && loc.y < opts.coords.bottom) {
        // bottom-middle section
        amt = (opts.coords.bottom - loc.y) / opts.maxDist;
      } else if (loc.y > opts.corners[2].y && loc.y < opts.corners[1].y && loc.x < opts.coords.left) {
        // left-middle section
        amt = (opts.coords.left - loc.x) / opts.maxDist;
      } else if (loc.x <= opts.corners[0].x && loc.y >= opts.corners[0].y) {
        // top-left corner
        radialDist = Caman.distance(loc.x, loc.y, opts.corners[0].x, opts.corners[0].y);
        amt = (radialDist - opts.cornerRadius) / opts.maxDist;
      } else if (loc.x >= opts.corners[1].x && loc.y >= opts.corners[1].y) {
        // top-right corner
        radialDist = Caman.distance(loc.x, loc.y, opts.corners[1].x, opts.corners[1].y);
        amt = (radialDist - opts.cornerRadius) / opts.maxDist;
      } else if (loc.x >= opts.corners[2].x && loc.y <= opts.corners[2].y) {
        // bottom-right corner
        radialDist = Caman.distance(loc.x, loc.y, opts.corners[2].x, opts.corners[2].y);
        amt = (radialDist - opts.cornerRadius) / opts.maxDist;
      } else if (loc.x <= opts.corners[3].x && loc.y <= opts.corners[3].y) {
        // bottom-left corner
        radialDist = Caman.distance(loc.x, loc.y, opts.corners[3].x, opts.corners[3].y);
        amt = (radialDist - opts.cornerRadius) / opts.maxDist;
      }
      
      if (amt < 0) {
        // Inside of rounded corner
        return rgba;
      }
      
      return vignetteFilters[opts.method](rgba, amt, opts);
    });
  };

}(Caman));