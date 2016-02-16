"use strict";

// TODO(kangz) are asserts a thing in Javascript?

var glUtils = {
    initGL: function(canvas, options) {
        options = options || {};

        var gl = null;
        try {
            gl = canvas.getContext("webgl");
        } catch (e) {
        }

        if (gl === null) {
            return null;
        }

        for (var property in this) {
            if (property === "initGL") {
                continue;
            }
            gl[property] = this[property];
        }

        if (!gl.initExtensions(options)) {
            return null;
        }

        gl.initDefaultFramebuffer();
        gl.initStateTracking();
        gl.initTables();
        gl.activeTextureManager = new this.ActiveTextureManager(gl);

        return gl;
    },

    initDefaultFramebuffer: function() {
        var gl = this;
        this.defaultFramebuffer = {
            bind: function() {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }
        };
    },

    initExtensions: function(options) {
        function makeExtensionProxy(ext, func) {
            return function() {func.apply(ext, arguments);};
        }

        this.extensions = this.getSupportedExtensions();

        // We always want to be using VAOs so as to simplify state tracking.
        var requestedExtensions = ["OES_vertex_array_object"];
        if (options["extensions"]) {
            requestedExtensions = requestedExtensions.concat(options["extensions"]);
        }

        for (var i in requestedExtensions) {
            var extension = requestedExtensions[i];
            if (!extension in this.extensions) {
                // TODO(kangz) console.error isn't available everywhere
                console.error("WebGL extension " + extension + " is not available.");
                return false;
            }

            var extensionObject = this.getExtension(extension);
            for (var property in extensionObject) {

                var value = extensionObject[property];
                if (property == property.toUpperCase()) {
                    this[property] = value;
                } else {
                    // The extension entry points expect to be called with "this" being the
                    // extension object.
                    this[property] = makeExtensionProxy(extensionObject, value);
                }
            }
        }
        return true;
    },

    initStateTracking: function() {
        this.boundBuffer = null;
        this.boundFramebuffer = null;
        this.boundRenderbuffer = null;
        this.boundTexture = null;
        this.boundVAO = null;
        this.usedProgram = null;
    },

    initTables: function() {
        var gl = this;

        this.typeInfo = {};
        this.typeInfo[this.INT] = {
            type: "int",
            setter: function(handle, value) {
                gl.uniform1iv(location, new Int32Array(value));
            },
            size: 1
        };
        this.typeInfo[this.INT_VEC2] = {
            type: "int",
            setter: function(handle, value) {
                gl.uniform2iv(location, new Int32Array(value));
            },
            size: 2
        };
        this.typeInfo[this.INT_VEC3] = {
            type: "int",
            setter: function(handle, value) {
                gl.uniform3iv(location, new Int32Array(value));
            },
            size: 3
        };
        this.typeInfo[this.INT_VEC4] = {
            type: "int",
            setter: function(handle, value) {
                gl.uniform4iv(location, new Int32Array(value));
            },
            size: 4
        };
        this.typeInfo[this.BOOL] = {
            type: "bool",
            setter: function(handle, value) {
                gl.uniform1iv(location, new Int32Array(value));
            },
            size: 1
        };
        this.typeInfo[this.BOOL_VEC2] = {
            type: "bool",
            setter: function(handle, value) {
                gl.uniform2iv(location, new Int32Array(value));
            },
            size: 2
        };
        this.typeInfo[this.BOOL_VEC3] = {
            type: "bool",
            setter: function(handle, value) {
                gl.uniform3iv(location, new Int32Array(value));
            },
            size: 3
        };
        this.typeInfo[this.BOOL_VEC4] = {
            type: "bool",
            setter: function(handle, value) {
                gl.uniform4iv(location, new Int32Array(value));
            },
            size: 4
        };
        this.typeInfo[this.FLOAT] = {
            type: "float",
            setter: function(handle, value) {
                gl.uniform1fv(location, new Float32Array(value));
            },
            size: 1
        };
        this.typeInfo[this.FLOAT_VEC2] = {
            type: "float",
            setter: function(handle, value) {
                gl.uniform2fv(location, new Float32Array(value));
            },
            size: 2
        };
        this.typeInfo[this.FLOAT_VEC3] = {
            type: "float",
            setter: function(handle, value) {
                gl.uniform3fv(location, new Float32Array(value));
            },
            size: 3
        };
        this.typeInfo[this.FLOAT_VEC4] = {
            type: "float",
            setter: function(handle, value) {
                gl.uniform4fv(location, new Float32Array(value));
            },
            size: 4
        };
        this.typeInfo[this.FLOAT_MAT2] = {
            type: "matrix",
            setter: function(handle, value) {
                gl.uniformMatrix2fv(location, false, new Float32Array(value));
            },
            size: 4
        };
        this.typeInfo[this.FLOAT_MAT3] = {
            type: "matrix",
            setter: function(handle, value) {
                gl.uniformMatrix3fv(location, false, new Float32Array(value));
            },
            size: 9
        };
        this.typeInfo[this.FLOAT_MAT4] = {
            type: "matrix",
            setter: function(handle, value) {
                gl.uniformMatrix4fv(location, false, new Float32Array(value));
            },
            size: 16
        };
        this.typeInfo[this.SAMPLER_2D] = {
            type: "texture",
            setter: function(handle, value) {
                gl.uniform1iv(location, new Int32Array(value));
            },
            size: 1
        }

        this.frameBufferAttachment = {};
        this.frameBufferAttachment["color"] = this.COLOR_ATTACHMENT0;
        this.frameBufferAttachment["depth"] = this.DEPTH_ATTACHMENT;
        this.frameBufferAttachment["stencil"] = this.STENCIL_ATTACHMENT;
        this.frameBufferAttachment["depth_stencil"] = this.DEPTH_STENCIL_ATTACHMENT;

        this.textureFormat = {};
        this.textureFormat["alpha"] = this.ALPHA;
        this.textureFormat["luminance"] = this.LUMINANCE;
        this.textureFormat["luminanceAlpha"] = this.LUMINANCE_ALPHA;
        this.textureFormat["rgb"] = this.RGB;
        this.textureFormat["rgba"] = this.RGBA;

        this.textureType = {};
        this.textureType["ubyte"] = this.UNSIGNED_BYTE;
        this.textureType["ushort4444"] = this.UNSIGNED_SHORT_4_4_4_4;
        this.textureType["ushort5551"] = this.UNSIGNED_SHORT_5_5_5_1;
        this.textureType["ushort565"] = this.UNSIGNED_SHORT_5_6_5;
        this.textureType["float"] = this.FLOAT;

        this.textureTypeArray = {};
        this.textureTypeArray["ubyte"] = function(data){ return new Uint8Array(data)};
        this.textureTypeArray["ushort4444"] = function(data){ return new Uint16Array(data)};
        this.textureTypeArray["ushort5551"] = function(data){ return new Uint16Array(data)};
        this.textureTypeArray["ushort565"] = function(data){ return new Uint16Array(data)};
        this.textureTypeArray["float"] = function(data){ return new Float32Array(data)};

        this.textureWrapMode = {};
        this.textureWrapMode["edge"] = this.CLAMP_TO_EDGE;
        this.textureWrapMode["repeat"] = this.REPEAT;
        this.textureWrapMode["mirroredRepeat"] = this.MIRRORED_REPEAT;

        this.textureFilter = {};
        this.textureFilter["linear"] = this.LINEAR;
        this.textureFilter["nearest"] = this.NEAREST;
    }
};

glUtils.ActiveTextureManager = function(gl) {
    // We use the available texture units as a LRU cache. We reserver one texture
    // unit (the last one) to be dirtied by glBindTexture outside of activate.
    this.gl = gl;

    this.numUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    this.serial = 0;

    this.units = [];
    for (var i = 0; i < this.numUnits; i++) {
        this.units.push(null);
    }

    this.gl.activeTexture(this.gl.TEXTURE0 + this.numUnits - 1);
}

glUtils.ActiveTextureManager.prototype = {
    activate: function(texture) {
        this.serial++;

        if(texture.texUnit >= 0){
            texture.lastTimeActive = this.serial;
            return texture.texUnit;
        }

        var unit = 0;
        for(var i = 0; i < this.numUnits - 1; ++i){
            if(!this.units[i]){
                unit = i;
                break;
            }
            if(this.units[i].lastTimeActive < this.units[unit].lastTimeActive) {
                unit = i;
            }
        }

        if(this.units[unit]) {
            this.units[unit].texUnit = -1;
        }

        this.units[unit] = texture;
        texture.lastTimeActive = this.count;
        texture.texUnit = unit;

        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        texture.bind(true);
        this.gl.activeTexture(this.gl.TEXTURE0 + this.numUnits - 1);

        return unit;
    }
};

glUtils.Buffer = function (gl, usage, type, data) {
    this.gl = gl;
    this.usage = usage;
    this.type = type;
    this.glObject = gl.createBuffer();

    if (data) {
        var arrayType = (type == gl.ARRAY_BUFFER ? Float32Array : Uint16Array);
        this.data(new arrayType(data));
    }
};

glUtils.Buffer.prototype = {
    bind: function() {
        if (this.gl.boundBuffer !== this) {
            this.gl.bindBuffer(this.type, this.glObject);
        }
        return this;
    },

    data: function(typedArray) {
        this.bind();
        this.gl.bufferData(this.type, typedArray, this.usage);
    },

    reserve: function(size) {
        this.bind();
        this.gl.bufferData(this.type, size, this.usage);
    },

    subData: function(offset, typedArray) {
        this.bind();
        this.gl.bufferSubData(this.type, offset, typedArray);
    },
};

glUtils.ArrayBuffer = function(gl, usage, data) {
        return new gl.Buffer(gl, usage, gl.ARRAY_BUFFER, data);
};

glUtils.ElementBuffer = function(gl, usage, data) {
    return new gl.Buffer(gl, usage, gl.ELEMENT_BUFFER, data);
};

glUtils.createArrayBuffer = function(usage) {
    return new this.ArrayBuffer(this, usage, this.utils.concatArray(arguments, 1));
};

glUtils.createElementBuffer = function() {
    return new this.ElementBuffer(this, usage, this.utils.concatArray(arguments, 1));
};

glUtils.Framebuffer = function(gl) {
    this.gl = gl;
    this.glObject = this.gl.createFramebuffer();
};

glUtils.Framebuffer.prototype = {
    attach: function(attachments) {
        this.bind();

        for (var attachmentName in this.gl.framebufferAttachment) {
            if (!attachments[attachmentName]) {
                continue;
            }

            var attachment = attachments[attachmentName];
            var attachmentPoint = this.gl.framebufferAttachment[attachmentName];
            // TODO(kangz) how about renderbuffers?
            // TODO(kangz) how about cubemaps and mipmaps?
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, attachmentPoint, this.gl.TEXTURE_2D, attachment.glObject, 0);
        }
    },

    bind: function() {
        if (this.gl.boundFramebuffer !== this) {
            this.gl.bindFramebuffer(gl.FRAMEBUFFER, this.glObject);
            this.gl.boundFramebuffer = this;
        }
    }
};

glUtils.Program = function(gl) {
    this.gl = gl;
    this.glObject = gl.createProgram();
    this.linked = false;
    this.attributes = {};
    this.uniforms = {};
};

glUtils.Program.prototype = {
    attach: function(shader) {
        this.gl.attachShader(this.glObject, shader.glObject);
        return this;
    },

    cacheVariables: function() {
        var numAttribs = this.gl.getProgramParameter(this.glObject, this.gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < numAttribs; ++i) {
            var attribInfo = this.gl.getActiveAttrib(this.glObject, i);

            var typeInfo = this.gl.typeInfo[attribInfo.type];

            this.attributes[attribInfo.name] = {
                arraySize: attribInfo.size,
                type: attribInfo.type,
                size: typeInfo.size,
                location: this.gl.getAttribLocation(this.glObject, attribInfo.name)
            }
        }


        var numUniforms = this.gl.getProgramParameter(this.glObject, this.gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < numUniforms; ++i) {
            var uniformInfo = this.gl.getActiveUniform(this.glObject, i);

            var typeInfo = this.gl.typeInfo[uniformInfo.type];

            this.uniforms[name] = {
                arraySize: uniformInfo.size,
                glType: uniformInfo.type,
                type: typeInfo.type,
                size: typeInfo.size,
                location: this.gl.getUniformLocation(this.glObject, name),
                setter: typeInfo.setter,
            }
        }
    },

    createVAO: function(attributeValues) {
        var VAO = this.gl.createVAO(this);
        VAO.bind();

        for (var attributeName in attributeValues) {
            var value = attributeValues[attributeName];

            if (attributeName == "index") {
                value["buffer"].bind();
                continue;
            }

            if (!this.attributes[attributeName]) {
                continue;
            }

            var attribInfo = this.attributes[attributeName];

            var buffer = value["buffer"];
            var offset = value["offset"] || 0;
            var divisor = value["divisor"] || 0;
            var stride = value["stride"] || 0;
            var normalized = value["normalized"] || false;
            var glType = value["type"] || this.gl.FLOAT; // TODO(kangz) accept other types

            var size = attribInfo.size * attribInfo.arraySize;
            var location = attribInfo.location;

            buffer.bind();

            // TODO(kangz) I pointer for type other than float?
            this.gl.enableVertexAttribArray(location);
            this.gl.vertexAttribPointer(location, size, glType, normalized, stride, offset);

            if (this.gl.vertexAttribDivisorANGLE) {
                this.gl.vertexAttribDivisorANGLE(location, divisor);
            }
        }

        VAO.unbind();

        return VAO;
    },

    link: function() {
        this.gl.linkProgram(this.glObject);

        if (!this.gl.getProgramParameter(this.glObject, this.gl.LINK_STATUS)) {
            // TODO(kangz) console.error isn't available everywhere
            console.error("Error linking program: " + gl.getShaderInfoLog(this.glObject));
            return this;
        }

        this.linked = true;
        this.cacheVariables();

        return this;
    },

    setUniforms: function(uniformValues) {
        //this.use();
        for (var uniformName in uniformValues) {
            if (!this.uniforms[uniformName]) {
                continue;
            }

            var uniformInfo = this.uniforms[uniformName];
            var value = uniformValues[uniformName];

            if (uniformInfo.arraySize != 1) {
                value = this.gl.utils.concatArray(value, 0);
            } else if (value.constructor !== Array) {
                value = [value];
            }

            if (uniformInfo.type == "texture") {
                value = value.map(function(texture) {
                    return texture.activate();
                })
            }

            uniformInfo.setter(uniformInfo.location, value);
        }
        return this;
    },

    use: function() {
        if (this.gl.usedProgram !== this) {
            this.gl.useProgram(this.glObject);
            this.gl.usedProgram = this;
        }
        return this;
    },
};

// FIXME(kangz) would ideally be createProgram but it conflicts with glCreateProgram
glUtils.createShaderProgram = function() {
    var program = new this.Program(this);

    for (var i = 0; i < arguments.length; ++i) {
        program.attach(arguments[i]);
    }

    if (arguments.length >= 2) {
        program.link();
    }

    return program;
};

glUtils.Shader = function(gl, type, source) {
    this.gl = gl;
    this.type = type;
    this.glObject = gl.createShader(type);

    gl.shaderSource(this.glObject, source);
    gl.compileShader(this.glObject);

    if (!gl.getShaderParameter(this.glObject, gl.COMPILE_STATUS)) {
        // TODO(kangz) console.error isn't available everywhere
        console.error("Error compiling shader: " + gl.getShaderInfoLog(this.glObject));
        return null;
    }
};

glUtils.Shader.prototype = {
};

glUtils.createFragmentShader = function(source) {
    return new this.Shader(this, this.FRAGMENT_SHADER, source);
};

glUtils.createVertexShader = function(source) {
    return new this.Shader(this, this.VERTEX_SHADER, source);
};

glUtils.createShaderFromElement = function(element) {
    var source = element.textContent;

    if (element.type == "x-shader/x-fragment") {
        return this.createFragmentShader(source);
    } else if (element.type == "x-shader/x-vertex") {
        return this.createVertexShader(source);
    } else {
        // TODO(kangz) console.error isn't available everywhere
        console.error("Unknown shader element type: " + element.type);
    }
};

glUtils.createShaderFromId = function(id) {
    return this.createShaderFromElement(document.getElementById(id));
};

glUtils.VertexArray = function(gl, program) {
    this.gl = gl;
    this.program = program;
    this.glObject = this.gl.createVertexArrayOES();
};

glUtils.Texture = function(gl, options) {
    options = options || {}

    this.gl = gl;
    this.width = 0;
    this.height = 0;
    this.glObject = gl.createTexture();

    this.texUnit = -1;
    this.lastTimeActive = -1;

    this.format = gl.textureFormat[options["format"] || "rgba"];
    this.type = gl.textureType[options["type"] || "rgba"];
    // TODO(kangz) how about cubemaps?
    this.target = gl.TEXTURE_2D;

    this.minFilter = gl.textureFilter[options["minFilter"] || "nearest"];
    this.magFilter = gl.textureFilter[options["magFilter"] || "nearest"];

    this.wrapS = gl.textureWrapMode[options["wrapS"] || "repeat"];
    this.wrapT = gl.textureWrapMode[options["wrapT"] || "repeat"];
}

glUtils.Texture.prototype = {
    activate: function() {
        return this.gl.activeTextureManager.activate(this);
    },

    bind: function(force) {
        // TODO texture manager leave dummy active texture at all time
        if (this.gl.boundTexture !== this || force) {
            this.gl.bindTexture(this.target, this.glObject);
            this.gl.boundTexture = this;
        }
        return this;
    },

    emptyData: function(width, height) {
        this.width = width;
        this.height = height;

        this.bind().setFilterAndWrap();
        this.gl.texImage2d(this.target, 0, this.format, width, height, 0, this.format, this.type, null);

        return this;
    },

    setFilterAndWrap: function() {
        this.bind();
        this.gl.texParameteri(target, this.gl.TEXTURE_MAG_FILTER, this.magFilter);
        this.gl.texParameteri(target, this.gl.TEXTURE_MIN_FILTER, this.minFilter);        

        this.gl.texParameteri(target, this.gl.TEXTURE_WRAP_S, this.wrapS);
        this.gl.texParameteri(target, this.gl.TEXTURE_WRAP_T, this.wrapT);

        return this;
    },
}

glUtils.createEmptyTexture = function (width, height, options) {
    return new this.Texture(this, options).emptyData(width, height);
}

glUtils.VertexArray.prototype = {
    bind: function() {
        if (this.gl.boundVAO !== this) {
            this.gl.bindVertexArrayOES(this.glObject);
            this.gl.boundVAO = this;
        }
        return this;
    },

    drawArrays: function(mode, first, count) {
        this.bind();
        this.gl.drawArrays(mode, first, count);
        this.unbind();
    },

    drawElements: function(mode, count, offset) {
        this.bind();
        // TODO(kangz) get UNSIGNED_SHORT from the index buffer?
        this.gl.drawElements(mode, count, gl.UNSIGNED_SHORT, offset);
        this.unbind();
    },

    drawArraysInstanced: function(mode, first, count, primcount) {
        this.bind();
        this.gl.drawArraysInstancedANGLE(mode, first, count, primcount);
        this.unbind();
    },

    drawElements: function(mode, count, offset, primcount) {
        this.bind();
        // TODO(kangz) get UNSIGNED_SHORT from the index buffer?
        this.gl.drawElementsInstancedANGLE(mode, count, gl.UNSIGNED_SHORT, offset);
        this.unbind();
    },

    unbind: function() {
        this.gl.bindVertexArrayOES(null);
        this.gl.boundVAO = null;
    }
}

glUtils.createVAO = function(program) {
    return new this.VertexArray(this, program);
}

glUtils.utils = {
    // Returns the concatenation of all the elements of the argument
    concatArray: function(data, start) {
        var result = [];
        for(var i = start; i < data.length; ++i){
            result = result.concat(data[i]);
        }
        return result;
    },
};
