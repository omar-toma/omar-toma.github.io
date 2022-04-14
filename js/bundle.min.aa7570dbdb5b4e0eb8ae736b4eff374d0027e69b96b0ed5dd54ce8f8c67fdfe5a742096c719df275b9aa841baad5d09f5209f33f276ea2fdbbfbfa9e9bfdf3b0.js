'use strict';const canvas=document.getElementsByTagName("canvas")[0];resizeCanvas();let config={CAPTURE_RESOLUTION:512,PRESSURE:.6,SPLAT_FORCE:6e3,COLOR_UPDATE_SPEED:5,PAUSED:!1,SUNRAYS:!0,SUNRAYS_RESOLUTION:196,SUNRAYS_WEIGHT:.5,SIM_RESOLUTION:128,DYE_RESOLUTION:512,DENSITY_DISSIPATION:.97,VELOCITY_DISSIPATION:.98,PRESSURE_DISSIPATION:.8,PRESSURE_ITERATIONS:10,CURL:0,SPLAT_RADIUS:.1,SHADING:!0,COLORFUL:!0,BACK_COLOR:{r:0,g:0,b:0},TRANSPARENT:!1,BLOOM:!1,BLOOM_ITERATIONS:8,BLOOM_RESOLUTION:256,BLOOM_INTENSITY:.8,BLOOM_THRESHOLD:.6,BLOOM_SOFT_KNEE:.7};function pointerPrototype(){this.id=-1,this.texcoordX=0,this.texcoordY=0,this.prevTexcoordX=0,this.prevTexcoordY=0,this.deltaX=0,this.deltaY=0,this.down=!1,this.moved=!1,this.color=[30,0,300]}let pointers=[],splatStack=[];pointers.push(new pointerPrototype);const{gl,ext}=getWebGLContext(canvas);isMobile()&&(config.DYE_RESOLUTION=512),ext.supportLinearFiltering||(config.DYE_RESOLUTION=512,config.SHADING=!1,config.BLOOM=!1,config.SUNRAYS=!1);function getWebGLContext(i){const s={alpha:!0,depth:!1,stencil:!1,antialias:!1,preserveDrawingBuffer:!1};let e=i.getContext("webgl2",s);const n=!!e;n||(e=i.getContext("webgl",s)||i.getContext("experimental-webgl",s));let l,o;n?(e.getExtension("EXT_color_buffer_float"),o=e.getExtension("OES_texture_float_linear")):(l=e.getExtension("OES_texture_half_float"),o=e.getExtension("OES_texture_half_float_linear")),e.clearColor(0,0,0,1);const t=n?e.HALF_FLOAT:l.HALF_FLOAT_OES;let a,r,c;return n?(a=getSupportedFormat(e,e.RGBA16F,e.RGBA,t),r=getSupportedFormat(e,e.RG16F,e.RG,t),c=getSupportedFormat(e,e.R16F,e.RED,t)):(a=getSupportedFormat(e,e.RGBA,e.RGBA,t),r=getSupportedFormat(e,e.RGBA,e.RGBA,t),c=getSupportedFormat(e,e.RGBA,e.RGBA,t)),{gl:e,ext:{formatRGBA:a,formatRG:r,formatR:c,halfFloatTexType:t,supportLinearFiltering:o}}}function getSupportedFormat(e,t,s,n){if(!supportRenderTextureFormat(e,t,s,n))switch(t){case e.R16F:return getSupportedFormat(e,e.RG16F,e.RG,n);case e.RG16F:return getSupportedFormat(e,e.RGBA16F,e.RGBA,n);default:return null}return{internalFormat:t,format:s}}function supportRenderTextureFormat(e,n,s,o){let t=e.createTexture();e.bindTexture(e.TEXTURE_2D,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,n,4,4,0,s,o,null);let i=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,i),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0);let a=e.checkFramebufferStatus(e.FRAMEBUFFER);return a==e.FRAMEBUFFER_COMPLETE}function isMobile(){return/Mobi|Android/i.test(navigator.userAgent)}class Material{constructor(e,t){this.vertexShader=e,this.fragmentShaderSource=t,this.programs=[],this.activeProgram=null,this.uniforms=[]}setKeywords(t){let n=0;for(let e=0;e<t.length;e++)n+=hashCode(t[e]);let e=this.programs[n];if(e==null){let s=compileShader(gl.FRAGMENT_SHADER,this.fragmentShaderSource,t);e=createProgram(this.vertexShader,s),this.programs[n]=e}if(e==this.activeProgram)return;this.uniforms=getUniforms(e),this.activeProgram=e}bind(){gl.useProgram(this.activeProgram)}}class Program{constructor(e,t){this.uniforms={},this.program=createProgram(e,t),this.uniforms=getUniforms(this.program)}bind(){gl.useProgram(this.program)}}function createProgram(t,n){let e=gl.createProgram();return gl.attachShader(e,t),gl.attachShader(e,n),gl.linkProgram(e),gl.getProgramParameter(e,gl.LINK_STATUS)||console.trace(gl.getProgramInfoLog(e)),e}function getUniforms(e){let t=[],n=gl.getProgramParameter(e,gl.ACTIVE_UNIFORMS);for(let s=0;s<n;s++){let o=gl.getActiveUniform(e,s).name;t[o]=gl.getUniformLocation(e,o)}return t}function compileShader(n,t,s){t=addKeywords(t,s);const e=gl.createShader(n);return gl.shaderSource(e,t),gl.compileShader(e),gl.getShaderParameter(e,gl.COMPILE_STATUS)||console.trace(gl.getShaderInfoLog(e)),e}function addKeywords(e,t){if(t==null)return e;let n='';return t.forEach(e=>{n+="#define "+e+"\n"}),n+e}const baseVertexShader=compileShader(gl.VERTEX_SHADER,`
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`),blurVertexShader=compileShader(gl.VERTEX_SHADER,`
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        float offset = 1.33333333;
        vL = vUv - texelSize * offset;
        vR = vUv + texelSize * offset;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`),blurShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
        sum += texture2D(uTexture, vL) * 0.35294117;
        sum += texture2D(uTexture, vR) * 0.35294117;
        gl_FragColor = sum;
    }
`),copyShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`),clearShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`),colorShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`),checkerboardShader=compileShader(gl.FRAGMENT_SHADER,`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;

    #define SCALE 25.0

    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`),displayShaderSource=`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0));
        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;

    #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);

        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
    #endif

    #ifdef BLOOM
        vec3 bloom = texture2D(uBloom, vUv).rgb;
    #endif

    #ifdef SUNRAYS
        float sunrays = texture2D(uSunrays, vUv).r;
        c *= sunrays;
    #ifdef BLOOM
        bloom *= sunrays;
    #endif
    #endif

    #ifdef BLOOM
        float noise = texture2D(uDithering, vUv * ditherScale).r;
        noise = noise * 2.0 - 1.0;
        bloom += noise / 255.0;
        bloom = linearToGamma(bloom);
        c += bloom;
    #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
`,bloomPrefilterShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0);
    }
`),bloomBlurShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`),bloomFinalShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`),sunraysMaskShader=compileShader(gl.FRAGMENT_SHADER,`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`),sunraysShader=compileShader(gl.FRAGMENT_SHADER,`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;

        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;

        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;

        float color = texture2D(uTexture, vUv).a;

        for (int i = 0; i < ITERATIONS; i++)
        {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }

        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`),splatShader=compileShader(gl.FRAGMENT_SHADER,`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`),advectionShader=compileShader(gl.FRAGMENT_SHADER,`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;

        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }`,ext.supportLinearFiltering?null:["MANUAL_FILTERING"]),divergenceShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`),curlShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`),vorticityShader=compileShader(gl.FRAGMENT_SHADER,`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`),pressureShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`),gradientSubtractShader=compileShader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`),blit=(()=>(gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer()),gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,1,1,-1]),gl.STATIC_DRAW),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer()),gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW),gl.vertexAttribPointer(0,2,gl.FLOAT,!1,0,0),gl.enableVertexAttribArray(0),(e,t=!1)=>{e==null?(gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight),gl.bindFramebuffer(gl.FRAMEBUFFER,null)):(gl.viewport(0,0,e.width,e.height),gl.bindFramebuffer(gl.FRAMEBUFFER,e.fbo)),t&&(gl.clearColor(0,0,0,1),gl.clear(gl.COLOR_BUFFER_BIT)),gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0)}))();let dye,velocity,divergence,curl,pressure,bloom,bloomFramebuffers=[],sunrays,sunraysTemp;const blurProgram=new Program(blurVertexShader,blurShader),copyProgram=new Program(baseVertexShader,copyShader),clearProgram=new Program(baseVertexShader,clearShader),colorProgram=new Program(baseVertexShader,colorShader),checkerboardProgram=new Program(baseVertexShader,checkerboardShader),bloomPrefilterProgram=new Program(baseVertexShader,bloomPrefilterShader),bloomBlurProgram=new Program(baseVertexShader,bloomBlurShader),bloomFinalProgram=new Program(baseVertexShader,bloomFinalShader),sunraysMaskProgram=new Program(baseVertexShader,sunraysMaskShader),sunraysProgram=new Program(baseVertexShader,sunraysShader),splatProgram=new Program(baseVertexShader,splatShader),advectionProgram=new Program(baseVertexShader,advectionShader),divergenceProgram=new Program(baseVertexShader,divergenceShader),curlProgram=new Program(baseVertexShader,curlShader),vorticityProgram=new Program(baseVertexShader,vorticityShader),pressureProgram=new Program(baseVertexShader,pressureShader),gradienSubtractProgram=new Program(baseVertexShader,gradientSubtractShader),displayMaterial=new Material(baseVertexShader,displayShaderSource);function initFramebuffers(){let e=getResolution(config.SIM_RESOLUTION),s=getResolution(config.DYE_RESOLUTION);const t=ext.halfFloatTexType,o=ext.formatRGBA,i=ext.formatRG,n=ext.formatR,a=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;gl.disable(gl.BLEND),dye==null?dye=createDoubleFBO(s.width,s.height,o.internalFormat,o.format,t,a):dye=resizeDoubleFBO(dye,s.width,s.height,o.internalFormat,o.format,t,a),velocity==null?velocity=createDoubleFBO(e.width,e.height,i.internalFormat,i.format,t,a):velocity=resizeDoubleFBO(velocity,e.width,e.height,i.internalFormat,i.format,t,a),divergence=createFBO(e.width,e.height,n.internalFormat,n.format,t,gl.NEAREST),curl=createFBO(e.width,e.height,n.internalFormat,n.format,t,gl.NEAREST),pressure=createDoubleFBO(e.width,e.height,n.internalFormat,n.format,t,gl.NEAREST),initBloomFramebuffers(),initSunraysFramebuffers()}function initBloomFramebuffers(){let e=getResolution(config.BLOOM_RESOLUTION);const n=ext.halfFloatTexType,t=ext.formatRGBA,s=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;bloom=createFBO(e.width,e.height,t.internalFormat,t.format,n,s),bloomFramebuffers.length=0;for(let o=0;o<config.BLOOM_ITERATIONS;o++){let i=e.width>>o+1,a=e.height>>o+1;if(i<2||a<2)break;let r=createFBO(i,a,t.internalFormat,t.format,n,s);bloomFramebuffers.push(r)}}function initSunraysFramebuffers(){let e=getResolution(config.SUNRAYS_RESOLUTION);const n=ext.halfFloatTexType,t=ext.formatR,s=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;sunrays=createFBO(e.width,e.height,t.internalFormat,t.format,n,s),sunraysTemp=createFBO(e.width,e.height,t.internalFormat,t.format,n,s)}function createFBO(e,t,i,a,r,s){gl.activeTexture(gl.TEXTURE0);let n=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,n),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,s),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,s),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.texImage2D(gl.TEXTURE_2D,0,i,e,t,0,a,r,null);let o=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,o),gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,n,0),gl.viewport(0,0,e,t),gl.clear(gl.COLOR_BUFFER_BIT);let c=1/e,l=1/t;return{texture:n,fbo:o,width:e,height:t,texelSizeX:c,texelSizeY:l,attach(e){return gl.activeTexture(gl.TEXTURE0+e),gl.bindTexture(gl.TEXTURE_2D,n),e}}}function createDoubleFBO(n,s,o,i,a,r){let e=createFBO(n,s,o,i,a,r),t=createFBO(n,s,o,i,a,r);return{width:n,height:s,texelSizeX:e.texelSizeX,texelSizeY:e.texelSizeY,get read(){return e},set read(t){e=t},get write(){return t},set write(e){t=e},swap(){let n=e;e=t,t=n}}}function resizeFBO(t,r,n,s,o,i,a){let e=createFBO(r,n,s,o,i,a);return copyProgram.bind(),gl.uniform1i(copyProgram.uniforms.uTexture,t.attach(0)),blit(e),e}function resizeDoubleFBO(e,t,n,s,o,i,a){return e.width==t&&e.height==n?e:(e.read=resizeFBO(e.read,t,n,s,o,i,a),e.write=createFBO(t,n,s,o,i,a),e.width=t,e.height=n,e.texelSizeX=1/t,e.texelSizeY=1/n,e)}function updateKeywords(){let e=[];config.SHADING&&e.push("SHADING"),config.BLOOM&&e.push("BLOOM"),config.SUNRAYS&&e.push("SUNRAYS"),displayMaterial.setKeywords(e)}updateKeywords(),initFramebuffers();let lastUpdateTime=Date.now(),colorUpdateTimer=0;update();function update(){const e=calcDeltaTime();resizeCanvas()&&initFramebuffers(),updateColors(e),applyInputs(),1,config.PAUSED||step(e),render(null),requestAnimationFrame(update)}function calcDeltaTime(){let t=Date.now(),e=(t-lastUpdateTime)/1e3;return e=Math.min(e,.016666),lastUpdateTime=t,e}function resizeCanvas(){let e=scaleByPixelRatio(canvas.clientWidth),t=scaleByPixelRatio(canvas.clientHeight);return!!(canvas.width!=e||canvas.height!=t)&&(canvas.width=e,canvas.height=t,!0)}function updateColors(e){if(!config.COLORFUL)return;colorUpdateTimer+=e*config.COLOR_UPDATE_SPEED,colorUpdateTimer>=1&&(colorUpdateTimer=wrap(colorUpdateTimer,0,1),pointers.forEach(e=>{e.color=generateColor()}))}function applyInputs(){splatStack.length>0&&multipleSplats(splatStack.pop()),pointers.forEach(e=>{e.moved&&(e.moved=!1,splatPointer(e))})}function step(e){gl.disable(gl.BLEND),curlProgram.bind(),gl.uniform2f(curlProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(curlProgram.uniforms.uVelocity,velocity.read.attach(0)),blit(curl),vorticityProgram.bind(),gl.uniform2f(vorticityProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(vorticityProgram.uniforms.uVelocity,velocity.read.attach(0)),gl.uniform1i(vorticityProgram.uniforms.uCurl,curl.attach(1)),gl.uniform1f(vorticityProgram.uniforms.curl,config.CURL),gl.uniform1f(vorticityProgram.uniforms.dt,e),blit(velocity.write),velocity.swap(),divergenceProgram.bind(),gl.uniform2f(divergenceProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(divergenceProgram.uniforms.uVelocity,velocity.read.attach(0)),blit(divergence),clearProgram.bind(),gl.uniform1i(clearProgram.uniforms.uTexture,pressure.read.attach(0)),gl.uniform1f(clearProgram.uniforms.value,config.PRESSURE),blit(pressure.write),pressure.swap(),pressureProgram.bind(),gl.uniform2f(pressureProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(pressureProgram.uniforms.uDivergence,divergence.attach(0));for(let e=0;e<config.PRESSURE_ITERATIONS;e++)gl.uniform1i(pressureProgram.uniforms.uPressure,pressure.read.attach(1)),blit(pressure.write),pressure.swap();gradienSubtractProgram.bind(),gl.uniform2f(gradienSubtractProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(gradienSubtractProgram.uniforms.uPressure,pressure.read.attach(0)),gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity,velocity.read.attach(1)),blit(velocity.write),velocity.swap(),advectionProgram.bind(),gl.uniform2f(advectionProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),ext.supportLinearFiltering||gl.uniform2f(advectionProgram.uniforms.dyeTexelSize,velocity.texelSizeX,velocity.texelSizeY);let t=velocity.read.attach(0);gl.uniform1i(advectionProgram.uniforms.uVelocity,t),gl.uniform1i(advectionProgram.uniforms.uSource,t),gl.uniform1f(advectionProgram.uniforms.dt,e),gl.uniform1f(advectionProgram.uniforms.dissipation,config.VELOCITY_DISSIPATION),blit(velocity.write),velocity.swap(),ext.supportLinearFiltering||gl.uniform2f(advectionProgram.uniforms.dyeTexelSize,dye.texelSizeX,dye.texelSizeY),gl.uniform1i(advectionProgram.uniforms.uVelocity,velocity.read.attach(0)),gl.uniform1i(advectionProgram.uniforms.uSource,dye.read.attach(1)),gl.uniform1f(advectionProgram.uniforms.dissipation,config.DENSITY_DISSIPATION),blit(dye.write),dye.swap()}function render(e){config.BLOOM&&applyBloom(dye.read,bloom),config.SUNRAYS&&(applySunrays(dye.read,dye.write,sunrays),blur(sunrays,sunraysTemp,1)),e==null||!config.TRANSPARENT?(gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA),gl.enable(gl.BLEND)):gl.disable(gl.BLEND),config.TRANSPARENT||drawColor(e,normalizeColor(config.BACK_COLOR)),e==null&&config.TRANSPARENT&&drawCheckerboard(e),drawDisplay(e)}function drawColor(t,e){colorProgram.bind(),gl.uniform4f(colorProgram.uniforms.color,e.r,e.g,e.b,1),blit(t)}function drawCheckerboard(e){checkerboardProgram.bind(),gl.uniform1f(checkerboardProgram.uniforms.aspectRatio,canvas.width/canvas.height),blit(e)}function drawDisplay(e){let t=e==null?gl.drawingBufferWidth:e.width,n=e==null?gl.drawingBufferHeight:e.height;displayMaterial.bind(),config.SHADING&&gl.uniform2f(displayMaterial.uniforms.texelSize,1/t,1/n),gl.uniform1i(displayMaterial.uniforms.uTexture,dye.read.attach(0)),config.BLOOM&&gl.uniform1i(displayMaterial.uniforms.uBloom,bloom.attach(1)),config.SUNRAYS&&gl.uniform1i(displayMaterial.uniforms.uSunrays,sunrays.attach(3)),blit(e)}function applyBloom(s,n){if(bloomFramebuffers.length<2)return;let e=n;gl.disable(gl.BLEND),bloomPrefilterProgram.bind();let t=config.BLOOM_THRESHOLD*config.BLOOM_SOFT_KNEE+1e-4,o=config.BLOOM_THRESHOLD-t,i=t*2,a=.25/t;gl.uniform3f(bloomPrefilterProgram.uniforms.curve,o,i,a),gl.uniform1f(bloomPrefilterProgram.uniforms.threshold,config.BLOOM_THRESHOLD),gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture,s.attach(0)),blit(e),bloomBlurProgram.bind();for(let t=0;t<bloomFramebuffers.length;t++){let n=bloomFramebuffers[t];gl.uniform2f(bloomBlurProgram.uniforms.texelSize,e.texelSizeX,e.texelSizeY),gl.uniform1i(bloomBlurProgram.uniforms.uTexture,e.attach(0)),blit(n),e=n}gl.blendFunc(gl.ONE,gl.ONE),gl.enable(gl.BLEND);for(let n=bloomFramebuffers.length-2;n>=0;n--){let t=bloomFramebuffers[n];gl.uniform2f(bloomBlurProgram.uniforms.texelSize,e.texelSizeX,e.texelSizeY),gl.uniform1i(bloomBlurProgram.uniforms.uTexture,e.attach(0)),gl.viewport(0,0,t.width,t.height),blit(t),e=t}gl.disable(gl.BLEND),bloomFinalProgram.bind(),gl.uniform2f(bloomFinalProgram.uniforms.texelSize,e.texelSizeX,e.texelSizeY),gl.uniform1i(bloomFinalProgram.uniforms.uTexture,e.attach(0)),gl.uniform1f(bloomFinalProgram.uniforms.intensity,config.BLOOM_INTENSITY),blit(n)}function applySunrays(t,e,n){gl.disable(gl.BLEND),sunraysMaskProgram.bind(),gl.uniform1i(sunraysMaskProgram.uniforms.uTexture,t.attach(0)),blit(e),sunraysProgram.bind(),gl.uniform1f(sunraysProgram.uniforms.weight,config.SUNRAYS_WEIGHT),gl.uniform1i(sunraysProgram.uniforms.uTexture,e.attach(0)),blit(n)}function blur(e,t,n){blurProgram.bind();for(let s=0;s<n;s++)gl.uniform2f(blurProgram.uniforms.texelSize,e.texelSizeX,0),gl.uniform1i(blurProgram.uniforms.uTexture,e.attach(0)),blit(t),gl.uniform2f(blurProgram.uniforms.texelSize,0,e.texelSizeY),gl.uniform1i(blurProgram.uniforms.uTexture,t.attach(0)),blit(e)}function splatPointer(e){let t=e.deltaX*config.SPLAT_FORCE,n=e.deltaY*config.SPLAT_FORCE;splat(e.texcoordX,e.texcoordY,t,n,e.color)}function multipleSplats(e){for(let n=0;n<e;n++){const t=generateColor();t.r*=10,t.g*=10,t.b*=10;const s=Math.random(),o=Math.random(),i=1e3*(Math.random()-.5),a=1e3*(Math.random()-.5);splat(s,o,i,a,t)}}function splat(t,n,s,o,e){splatProgram.bind(),gl.uniform1i(splatProgram.uniforms.uTarget,velocity.read.attach(0)),gl.uniform1f(splatProgram.uniforms.aspectRatio,canvas.width/canvas.height),gl.uniform2f(splatProgram.uniforms.point,t,n),gl.uniform3f(splatProgram.uniforms.color,s,o,0),gl.uniform1f(splatProgram.uniforms.radius,correctRadius(config.SPLAT_RADIUS/100)),blit(velocity.write),velocity.swap(),gl.uniform1i(splatProgram.uniforms.uTarget,dye.read.attach(0)),gl.uniform3f(splatProgram.uniforms.color,e.r,e.g,e.b),blit(dye.write),dye.swap()}function correctRadius(e){let t=canvas.width/canvas.height;return t>1&&(e*=t),e}canvas.addEventListener("mousedown",t=>{let n=scaleByPixelRatio(t.offsetX),s=scaleByPixelRatio(t.offsetY),e=pointers.find(e=>e.id==-1);e==null&&(e=new pointerPrototype),updatePointerDownData(e,-1,n,s)}),canvas.addEventListener("mousemove",e=>{let t=pointers[0],n=scaleByPixelRatio(e.offsetX),s=scaleByPixelRatio(e.offsetY);updatePointerMoveData(t,n,s)}),window.addEventListener("mouseup",()=>{updatePointerUpData(pointers[0])}),canvas.addEventListener("touchstart",t=>{t.preventDefault();const e=t.targetTouches;for(;e.length>=pointers.length;)pointers.push(new pointerPrototype);for(let t=0;t<e.length;t++){let n=scaleByPixelRatio(e[t].pageX),s=scaleByPixelRatio(e[t].pageY);updatePointerDownData(pointers[t+1],e[t].identifier,n,s)}}),canvas.addEventListener("touchmove",t=>{t.preventDefault();const e=t.targetTouches;for(let t=0;t<e.length;t++){let n=pointers[t+1];if(!n.down)continue;let s=scaleByPixelRatio(e[t].pageX),o=scaleByPixelRatio(e[t].pageY);updatePointerMoveData(n,s,o)}},!1),window.addEventListener("touchend",t=>{const e=t.changedTouches;for(let t=0;t<e.length;t++){let n=pointers.find(n=>n.id==e[t].identifier);if(n==null)continue;updatePointerUpData(n)}}),window.addEventListener("keydown",e=>{e.key===" "});function updatePointerDownData(e,t,n,s){e.id=t,e.down=!0,e.moved=!1,e.texcoordX=n/canvas.width,e.texcoordY=1-s/canvas.height,e.prevTexcoordX=e.texcoordX,e.prevTexcoordY=e.texcoordY,e.deltaX=0,e.deltaY=0,e.color=generateColor()}function updatePointerMoveData(e,t,n){e.prevTexcoordX=e.texcoordX,e.prevTexcoordY=e.texcoordY,e.texcoordX=t/canvas.width,e.texcoordY=1-n/canvas.height,e.deltaX=correctDeltaX(e.texcoordX-e.prevTexcoordX),e.deltaY=correctDeltaY(e.texcoordY-e.prevTexcoordY),e.moved=Math.abs(e.deltaX)>0||Math.abs(e.deltaY)>0}function updatePointerUpData(e){e.down=!1}function correctDeltaX(e){let t=canvas.width/canvas.height;return t<1&&(e*=t),e}function correctDeltaY(e){let t=canvas.width/canvas.height;return t>1&&(e/=t),e}function generateColor(){let e=HSVtoRGB(Math.random(),1,1);return e.r*=.15,e.g*=.15,e.b*=.15,e}function HSVtoRGB(d,c,e){let t,n,s,r,l,o,i,a;switch(r=Math.floor(d*6),l=d*6-r,o=e*(1-c),i=e*(1-l*c),a=e*(1-(1-l)*c),r%6){case 0:t=e,n=a,s=o;break;case 1:t=i,n=e,s=o;break;case 2:t=o,n=e,s=a;break;case 3:t=o,n=i,s=e;break;case 4:t=a,n=o,s=e;break;case 5:t=e,n=o,s=i;break}return{r:t,g:n,b:s}}function normalizeColor(e){let t={r:e.r/255,g:e.g/255,b:e.b/255};return t}function wrap(n,e,s){let t=s-e;return t==0?e:(n-e)%t+e}function getResolution(t){let e=gl.drawingBufferWidth/gl.drawingBufferHeight;e<1&&(e=1/e);let n=Math.round(t),s=Math.round(t*e);return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:s,height:n}:{width:n,height:s}}function scaleByPixelRatio(e){let t=window.devicePixelRatio||1;return Math.floor(e*t)}function hashCode(t){if(t.length==0)return 0;let e=0;for(let n=0;n<t.length;n++)e=(e<<5)-e+t.charCodeAt(n),e|=0;return e}document.querySelector(".clickable").onclick=function(){const e=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0),t=Math.max(document.documentElement.clientHeight||0,window.innerHeight||0),n=Math.min(e,t)/4;recurringCircles(100,e/2,t/2,n,10,5)};function crazyCircles(e,n,s,t,o){let i=pointers[0];for(let a=0;a<e;a++){let r=n+t*Math.cos(2*Math.PI*a/e),c=s+t*Math.sin(2*Math.PI*a/e),l=scaleByPixelRatio(r),d=scaleByPixelRatio(c);setTimeout(()=>updatePointerMoveData(i,l,d),a*o)}}function recurringCircles(e,n,s,o,t,i){crazyCircles(e,n,s,o,t);let a=setInterval(function(){crazyCircles(e,n,s,o,t)},e*t);setTimeout(function(){clearInterval(a)},e*t*i)}function crazybs(){let n=10,o=500,i=500,s=300,e=[],t=()=>Math.random()*1e3;for(let t=0;t<n;t++){let r=(o+s*Math.cos(2*Math.PI*t/n))/1e3,c=(i+s*Math.sin(2*Math.PI*t/n))/1e3;const a=generateColor();a.r*=10,a.g*=10,a.b*=10,e.push({x:r,y:c,color:a})}for(let n=0;n<e.length;n++)n===0?splat(e[n].x,e[n].y,(e[n].x+t())*(n<e.length/2?1:-1),(e[n].y+t())*(n<e.length/2?1:-1),e[n].color):splat(e[n].x,e[n].y,(e[n-1].x+t())*(n<e.length/2?1:-1),(e[n-1].y+t())*(n<e.length/2?1:-1),e[n].color)}