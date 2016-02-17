"use strict";
var glExtras = {};

glExtras.makeHalfFloatComputeTexture = function(gl, components, width, height, options) {
    options = options || {};
    options["format"] = [undefined, "rgba", "rgba", "rgba", "rgba"][components];
    //options["type"] = [undefined, "rgb565", "float", "float", "float"][components];
    //options["type"] = [undefined, "ubyte", "float", "float", "float"][components];
    options["type"] = [undefined, "float", "float", "float", "float"][components];

    return gl.createEmptyTexture(width, height, options);
};

glExtras.ShaderPak = function() {
    // TODO(kangz) add error checking
    this.shaders = {};
    this.processedShaderCache = {};

    for (var i = 0; i < arguments.length; ++i) {
        this.addPakedShaders(arguments[i]);
    }
};

glExtras.ShaderPak.prototype = {
    addPakedShaders: function(pakedSource) {
        var self = this;
        var shader = pakedSource.split("//-----").slice(1);
        shader.forEach(function(source) {
            var spaceIndex = source.indexOf(" ");
            var newlineIndex = source.indexOf("\n", spaceIndex);
            self.shaders[source.substring(spaceIndex, newlineIndex).trim()] = source.substring(newlineIndex).trim();
        });
    },

    addShader: function(name, source) {
        this.shader[name] = source;
    },

    createProgram: function(gl, vertex, fragment) {
        return gl.createShaderProgram(
            gl.createVertexShader(this.getShader(vertex)),
            gl.createFragmentShader(this.getShader(fragment))
        );
    },

    getShader: function(name) {
        if (!this.processedShaderCache[name]) {
            this.processedShaderCache[name] = this.preprocess(name);
        }
        return this.processedShaderCache[name];
    },

    preprocess: function(name) {
        var self = this;
        var processed = "";
        var split = this.shaders[name].split("@include(");
        processed += split[0];
        split.slice(1).forEach(function(chunk) {
            var parenIndex = chunk.indexOf(")");
            processed += self.getShader(chunk.substring(0, parenIndex));
            processed += "\n" + chunk.substring(parenIndex + 1).trim() + "\n";
        });

        return processed;
    },
};
