'use strict';const canvas=document.getElementsByTagName('canvas')[0];resizeCanvas();let config={CAPTURE_RESOLUTION:512,PRESSURE:.6,SPLAT_FORCE:6e3,COLOR_UPDATE_SPEED:5,PAUSED:!1,SUNRAYS:!0,SUNRAYS_RESOLUTION:196,SUNRAYS_WEIGHT:.5,SIM_RESOLUTION:128,DYE_RESOLUTION:512,DENSITY_DISSIPATION:.97,VELOCITY_DISSIPATION:.98,PRESSURE_DISSIPATION:.8,PRESSURE_ITERATIONS:10,CURL:0,SPLAT_RADIUS:.1,SHADING:!0,COLORFUL:!0,BACK_COLOR:{r:0,g:0,b:0},TRANSPARENT:!1,BLOOM:!1,BLOOM_ITERATIONS:8,BLOOM_RESOLUTION:256,BLOOM_INTENSITY:.8,BLOOM_THRESHOLD:.6,BLOOM_SOFT_KNEE:.7};function pointerPrototype(){this.id=-1,this.texcoordX=0,this.texcoordY=0,this.prevTexcoordX=0,this.prevTexcoordY=0,this.deltaX=0,this.deltaY=0,this.down=!1,this.moved=!1,this.color=[30,0,300]}let pointers=[],splatStack=[];pointers.push(new pointerPrototype);const{gl,ext}=getWebGLContext(canvas);isMobile()&&(config.DYE_RESOLUTION=512),ext.supportLinearFiltering||(config.DYE_RESOLUTION=512,config.SHADING=!1,config.BLOOM=!1,config.SUNRAYS=!1);function getWebGLContext(f){const d={alpha:!0,depth:!1,stencil:!1,antialias:!1,preserveDrawingBuffer:!1};let a=f.getContext('webgl2',d);const c=!!a;c||(a=f.getContext('webgl',d)||f.getContext('experimental-webgl',d));let j,e;c?(a.getExtension('EXT_color_buffer_float'),e=a.getExtension('OES_texture_float_linear')):(j=a.getExtension('OES_texture_half_float'),e=a.getExtension('OES_texture_half_float_linear')),a.clearColor(0,0,0,1);const b=c?a.HALF_FLOAT:j.HALF_FLOAT_OES;let g,h,i;return c?(g=getSupportedFormat(a,a.RGBA16F,a.RGBA,b),h=getSupportedFormat(a,a.RG16F,a.RG,b),i=getSupportedFormat(a,a.R16F,a.RED,b)):(g=getSupportedFormat(a,a.RGBA,a.RGBA,b),h=getSupportedFormat(a,a.RGBA,a.RGBA,b),i=getSupportedFormat(a,a.RGBA,a.RGBA,b)),{gl:a,ext:{formatRGBA:g,formatRG:h,formatR:i,halfFloatTexType:b,supportLinearFiltering:e}}}function getSupportedFormat(a,b,d,c){if(!supportRenderTextureFormat(a,b,d,c))switch(b){case a.R16F:return getSupportedFormat(a,a.RG16F,a.RG,c);case a.RG16F:return getSupportedFormat(a,a.RGBA16F,a.RGBA,c);default:return null}return{internalFormat:b,format:d}}function supportRenderTextureFormat(a,c,d,e){let b=a.createTexture();a.bindTexture(a.TEXTURE_2D,b),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.texImage2D(a.TEXTURE_2D,0,c,4,4,0,d,e,null);let f=a.createFramebuffer();a.bindFramebuffer(a.FRAMEBUFFER,f),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,b,0);let g=a.checkFramebufferStatus(a.FRAMEBUFFER);return g==a.FRAMEBUFFER_COMPLETE}function isMobile(){return/Mobi|Android/i.test(navigator.userAgent)}class Material{constructor(a,b){this.vertexShader=a,this.fragmentShaderSource=b,this.programs=[],this.activeProgram=null,this.uniforms=[]}setKeywords(b){let c=0;for(let a=0;a<b.length;a++)c+=hashCode(b[a]);let a=this.programs[c];if(a==null){let d=compileShader(gl.FRAGMENT_SHADER,this.fragmentShaderSource,b);a=createProgram(this.vertexShader,d),this.programs[c]=a}if(a==this.activeProgram)return;this.uniforms=getUniforms(a),this.activeProgram=a}bind(){gl.useProgram(this.activeProgram)}}class Program{constructor(a,b){this.uniforms={},this.program=createProgram(a,b),this.uniforms=getUniforms(this.program)}bind(){gl.useProgram(this.program)}}function createProgram(b,c){let a=gl.createProgram();return gl.attachShader(a,b),gl.attachShader(a,c),gl.linkProgram(a),gl.getProgramParameter(a,gl.LINK_STATUS)||console.trace(gl.getProgramInfoLog(a)),a}function getUniforms(a){let b=[],c=gl.getProgramParameter(a,gl.ACTIVE_UNIFORMS);for(let d=0;d<c;d++){let e=gl.getActiveUniform(a,d).name;b[e]=gl.getUniformLocation(a,e)}return b}function compileShader(c,b,d){b=addKeywords(b,d);const a=gl.createShader(c);return gl.shaderSource(a,b),gl.compileShader(a),gl.getShaderParameter(a,gl.COMPILE_STATUS)||console.trace(gl.getShaderInfoLog(a)),a}function addKeywords(a,b){if(b==null)return a;let c='';return b.forEach(a=>{c+='#define '+a+'\n'}),c+a}const baseVertexShader=compileShader(gl.VERTEX_SHADER,`
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
    }`,ext.supportLinearFiltering?null:['MANUAL_FILTERING']),divergenceShader=compileShader(gl.FRAGMENT_SHADER,`
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
`),blit=(()=>(gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer()),gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,1,1,-1]),gl.STATIC_DRAW),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer()),gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW),gl.vertexAttribPointer(0,2,gl.FLOAT,!1,0,0),gl.enableVertexAttribArray(0),(a,b=!1)=>{a==null?(gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight),gl.bindFramebuffer(gl.FRAMEBUFFER,null)):(gl.viewport(0,0,a.width,a.height),gl.bindFramebuffer(gl.FRAMEBUFFER,a.fbo)),b&&(gl.clearColor(0,0,0,1),gl.clear(gl.COLOR_BUFFER_BIT)),gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0)}))();let dye,velocity,divergence,curl,pressure,bloom,bloomFramebuffers=[],sunrays,sunraysTemp;const blurProgram=new Program(blurVertexShader,blurShader),copyProgram=new Program(baseVertexShader,copyShader),clearProgram=new Program(baseVertexShader,clearShader),colorProgram=new Program(baseVertexShader,colorShader),checkerboardProgram=new Program(baseVertexShader,checkerboardShader),bloomPrefilterProgram=new Program(baseVertexShader,bloomPrefilterShader),bloomBlurProgram=new Program(baseVertexShader,bloomBlurShader),bloomFinalProgram=new Program(baseVertexShader,bloomFinalShader),sunraysMaskProgram=new Program(baseVertexShader,sunraysMaskShader),sunraysProgram=new Program(baseVertexShader,sunraysShader),splatProgram=new Program(baseVertexShader,splatShader),advectionProgram=new Program(baseVertexShader,advectionShader),divergenceProgram=new Program(baseVertexShader,divergenceShader),curlProgram=new Program(baseVertexShader,curlShader),vorticityProgram=new Program(baseVertexShader,vorticityShader),pressureProgram=new Program(baseVertexShader,pressureShader),gradienSubtractProgram=new Program(baseVertexShader,gradientSubtractShader),displayMaterial=new Material(baseVertexShader,displayShaderSource);function initFramebuffers(){let a=getResolution(config.SIM_RESOLUTION),d=getResolution(config.DYE_RESOLUTION);const b=ext.halfFloatTexType,e=ext.formatRGBA,f=ext.formatRG,c=ext.formatR,g=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;gl.disable(gl.BLEND),dye==null?dye=createDoubleFBO(d.width,d.height,e.internalFormat,e.format,b,g):dye=resizeDoubleFBO(dye,d.width,d.height,e.internalFormat,e.format,b,g),velocity==null?velocity=createDoubleFBO(a.width,a.height,f.internalFormat,f.format,b,g):velocity=resizeDoubleFBO(velocity,a.width,a.height,f.internalFormat,f.format,b,g),divergence=createFBO(a.width,a.height,c.internalFormat,c.format,b,gl.NEAREST),curl=createFBO(a.width,a.height,c.internalFormat,c.format,b,gl.NEAREST),pressure=createDoubleFBO(a.width,a.height,c.internalFormat,c.format,b,gl.NEAREST),initBloomFramebuffers(),initSunraysFramebuffers()}function initBloomFramebuffers(){let a=getResolution(config.BLOOM_RESOLUTION);const c=ext.halfFloatTexType,b=ext.formatRGBA,d=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;bloom=createFBO(a.width,a.height,b.internalFormat,b.format,c,d),bloomFramebuffers.length=0;for(let e=0;e<config.BLOOM_ITERATIONS;e++){let f=a.width>>e+1,g=a.height>>e+1;if(f<2||g<2)break;let h=createFBO(f,g,b.internalFormat,b.format,c,d);bloomFramebuffers.push(h)}}function initSunraysFramebuffers(){let a=getResolution(config.SUNRAYS_RESOLUTION);const c=ext.halfFloatTexType,b=ext.formatR,d=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;sunrays=createFBO(a.width,a.height,b.internalFormat,b.format,c,d),sunraysTemp=createFBO(a.width,a.height,b.internalFormat,b.format,c,d)}function createFBO(a,b,f,g,h,d){gl.activeTexture(gl.TEXTURE0);let c=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,c),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,d),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,d),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.texImage2D(gl.TEXTURE_2D,0,f,a,b,0,g,h,null);let e=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,e),gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,c,0),gl.viewport(0,0,a,b),gl.clear(gl.COLOR_BUFFER_BIT);let i=1/a,j=1/b;return{texture:c,fbo:e,width:a,height:b,texelSizeX:i,texelSizeY:j,attach(a){return gl.activeTexture(gl.TEXTURE0+a),gl.bindTexture(gl.TEXTURE_2D,c),a}}}function createDoubleFBO(c,d,e,f,g,h){let a=createFBO(c,d,e,f,g,h),b=createFBO(c,d,e,f,g,h);return{width:c,height:d,texelSizeX:a.texelSizeX,texelSizeY:a.texelSizeY,get read(){return a},set read(b){a=b},get write(){return b},set write(a){b=a},swap(){let c=a;a=b,b=c}}}function resizeFBO(b,h,c,d,e,f,g){let a=createFBO(h,c,d,e,f,g);return copyProgram.bind(),gl.uniform1i(copyProgram.uniforms.uTexture,b.attach(0)),blit(a),a}function resizeDoubleFBO(a,b,c,d,e,f,g){return a.width==b&&a.height==c?a:(a.read=resizeFBO(a.read,b,c,d,e,f,g),a.write=createFBO(b,c,d,e,f,g),a.width=b,a.height=c,a.texelSizeX=1/b,a.texelSizeY=1/c,a)}function updateKeywords(){let a=[];config.SHADING&&a.push("SHADING"),config.BLOOM&&a.push("BLOOM"),config.SUNRAYS&&a.push("SUNRAYS"),displayMaterial.setKeywords(a)}updateKeywords(),initFramebuffers();let lastUpdateTime=Date.now(),colorUpdateTimer=0;update();function update(){const a=calcDeltaTime();resizeCanvas()&&initFramebuffers(),updateColors(a),applyInputs(),1,config.PAUSED||step(a),render(null),requestAnimationFrame(update)}function calcDeltaTime(){let b=Date.now(),a=(b-lastUpdateTime)/1e3;return a=Math.min(a,.016666),lastUpdateTime=b,a}function resizeCanvas(){let a=scaleByPixelRatio(canvas.clientWidth),b=scaleByPixelRatio(canvas.clientHeight);return!!(canvas.width!=a||canvas.height!=b)&&(canvas.width=a,canvas.height=b,!0)}function updateColors(a){if(!config.COLORFUL)return;colorUpdateTimer+=a*config.COLOR_UPDATE_SPEED,colorUpdateTimer>=1&&(colorUpdateTimer=wrap(colorUpdateTimer,0,1),pointers.forEach(a=>{a.color=generateColor()}))}function applyInputs(){splatStack.length>0&&multipleSplats(splatStack.pop()),pointers.forEach(a=>{a.moved&&(a.moved=!1,splatPointer(a))})}function step(a){gl.disable(gl.BLEND),curlProgram.bind(),gl.uniform2f(curlProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(curlProgram.uniforms.uVelocity,velocity.read.attach(0)),blit(curl),vorticityProgram.bind(),gl.uniform2f(vorticityProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(vorticityProgram.uniforms.uVelocity,velocity.read.attach(0)),gl.uniform1i(vorticityProgram.uniforms.uCurl,curl.attach(1)),gl.uniform1f(vorticityProgram.uniforms.curl,config.CURL),gl.uniform1f(vorticityProgram.uniforms.dt,a),blit(velocity.write),velocity.swap(),divergenceProgram.bind(),gl.uniform2f(divergenceProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(divergenceProgram.uniforms.uVelocity,velocity.read.attach(0)),blit(divergence),clearProgram.bind(),gl.uniform1i(clearProgram.uniforms.uTexture,pressure.read.attach(0)),gl.uniform1f(clearProgram.uniforms.value,config.PRESSURE),blit(pressure.write),pressure.swap(),pressureProgram.bind(),gl.uniform2f(pressureProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(pressureProgram.uniforms.uDivergence,divergence.attach(0));for(let a=0;a<config.PRESSURE_ITERATIONS;a++)gl.uniform1i(pressureProgram.uniforms.uPressure,pressure.read.attach(1)),blit(pressure.write),pressure.swap();gradienSubtractProgram.bind(),gl.uniform2f(gradienSubtractProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),gl.uniform1i(gradienSubtractProgram.uniforms.uPressure,pressure.read.attach(0)),gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity,velocity.read.attach(1)),blit(velocity.write),velocity.swap(),advectionProgram.bind(),gl.uniform2f(advectionProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY),ext.supportLinearFiltering||gl.uniform2f(advectionProgram.uniforms.dyeTexelSize,velocity.texelSizeX,velocity.texelSizeY);let b=velocity.read.attach(0);gl.uniform1i(advectionProgram.uniforms.uVelocity,b),gl.uniform1i(advectionProgram.uniforms.uSource,b),gl.uniform1f(advectionProgram.uniforms.dt,a),gl.uniform1f(advectionProgram.uniforms.dissipation,config.VELOCITY_DISSIPATION),blit(velocity.write),velocity.swap(),ext.supportLinearFiltering||gl.uniform2f(advectionProgram.uniforms.dyeTexelSize,dye.texelSizeX,dye.texelSizeY),gl.uniform1i(advectionProgram.uniforms.uVelocity,velocity.read.attach(0)),gl.uniform1i(advectionProgram.uniforms.uSource,dye.read.attach(1)),gl.uniform1f(advectionProgram.uniforms.dissipation,config.DENSITY_DISSIPATION),blit(dye.write),dye.swap()}function render(a){config.BLOOM&&applyBloom(dye.read,bloom),config.SUNRAYS&&(applySunrays(dye.read,dye.write,sunrays),blur(sunrays,sunraysTemp,1)),a==null||!config.TRANSPARENT?(gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA),gl.enable(gl.BLEND)):gl.disable(gl.BLEND),config.TRANSPARENT||drawColor(a,normalizeColor(config.BACK_COLOR)),a==null&&config.TRANSPARENT&&drawCheckerboard(a),drawDisplay(a)}function drawColor(b,a){colorProgram.bind(),gl.uniform4f(colorProgram.uniforms.color,a.r,a.g,a.b,1),blit(b)}function drawCheckerboard(a){checkerboardProgram.bind(),gl.uniform1f(checkerboardProgram.uniforms.aspectRatio,canvas.width/canvas.height),blit(a)}function drawDisplay(a){let b=a==null?gl.drawingBufferWidth:a.width,c=a==null?gl.drawingBufferHeight:a.height;displayMaterial.bind(),config.SHADING&&gl.uniform2f(displayMaterial.uniforms.texelSize,1/b,1/c),gl.uniform1i(displayMaterial.uniforms.uTexture,dye.read.attach(0)),config.BLOOM&&gl.uniform1i(displayMaterial.uniforms.uBloom,bloom.attach(1)),config.SUNRAYS&&gl.uniform1i(displayMaterial.uniforms.uSunrays,sunrays.attach(3)),blit(a)}function applyBloom(d,c){if(bloomFramebuffers.length<2)return;let a=c;gl.disable(gl.BLEND),bloomPrefilterProgram.bind();let b=config.BLOOM_THRESHOLD*config.BLOOM_SOFT_KNEE+1e-4,e=config.BLOOM_THRESHOLD-b,f=b*2,g=.25/b;gl.uniform3f(bloomPrefilterProgram.uniforms.curve,e,f,g),gl.uniform1f(bloomPrefilterProgram.uniforms.threshold,config.BLOOM_THRESHOLD),gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture,d.attach(0)),blit(a),bloomBlurProgram.bind();for(let b=0;b<bloomFramebuffers.length;b++){let c=bloomFramebuffers[b];gl.uniform2f(bloomBlurProgram.uniforms.texelSize,a.texelSizeX,a.texelSizeY),gl.uniform1i(bloomBlurProgram.uniforms.uTexture,a.attach(0)),blit(c),a=c}gl.blendFunc(gl.ONE,gl.ONE),gl.enable(gl.BLEND);for(let c=bloomFramebuffers.length-2;c>=0;c--){let b=bloomFramebuffers[c];gl.uniform2f(bloomBlurProgram.uniforms.texelSize,a.texelSizeX,a.texelSizeY),gl.uniform1i(bloomBlurProgram.uniforms.uTexture,a.attach(0)),gl.viewport(0,0,b.width,b.height),blit(b),a=b}gl.disable(gl.BLEND),bloomFinalProgram.bind(),gl.uniform2f(bloomFinalProgram.uniforms.texelSize,a.texelSizeX,a.texelSizeY),gl.uniform1i(bloomFinalProgram.uniforms.uTexture,a.attach(0)),gl.uniform1f(bloomFinalProgram.uniforms.intensity,config.BLOOM_INTENSITY),blit(c)}function applySunrays(b,a,c){gl.disable(gl.BLEND),sunraysMaskProgram.bind(),gl.uniform1i(sunraysMaskProgram.uniforms.uTexture,b.attach(0)),blit(a),sunraysProgram.bind(),gl.uniform1f(sunraysProgram.uniforms.weight,config.SUNRAYS_WEIGHT),gl.uniform1i(sunraysProgram.uniforms.uTexture,a.attach(0)),blit(c)}function blur(a,b,c){blurProgram.bind();for(let d=0;d<c;d++)gl.uniform2f(blurProgram.uniforms.texelSize,a.texelSizeX,0),gl.uniform1i(blurProgram.uniforms.uTexture,a.attach(0)),blit(b),gl.uniform2f(blurProgram.uniforms.texelSize,0,a.texelSizeY),gl.uniform1i(blurProgram.uniforms.uTexture,b.attach(0)),blit(a)}function splatPointer(a){let b=a.deltaX*config.SPLAT_FORCE,c=a.deltaY*config.SPLAT_FORCE;splat(a.texcoordX,a.texcoordY,b,c,a.color)}function multipleSplats(a){for(let c=0;c<a;c++){const b=generateColor();b.r*=10,b.g*=10,b.b*=10;const d=Math.random(),e=Math.random(),f=1e3*(Math.random()-.5),g=1e3*(Math.random()-.5);splat(d,e,f,g,b)}}function splat(b,c,d,e,a){splatProgram.bind(),gl.uniform1i(splatProgram.uniforms.uTarget,velocity.read.attach(0)),gl.uniform1f(splatProgram.uniforms.aspectRatio,canvas.width/canvas.height),gl.uniform2f(splatProgram.uniforms.point,b,c),gl.uniform3f(splatProgram.uniforms.color,d,e,0),gl.uniform1f(splatProgram.uniforms.radius,correctRadius(config.SPLAT_RADIUS/100)),blit(velocity.write),velocity.swap(),gl.uniform1i(splatProgram.uniforms.uTarget,dye.read.attach(0)),gl.uniform3f(splatProgram.uniforms.color,a.r,a.g,a.b),blit(dye.write),dye.swap()}function correctRadius(a){let b=canvas.width/canvas.height;return b>1&&(a*=b),a}canvas.addEventListener('mousedown',b=>{let c=scaleByPixelRatio(b.offsetX),d=scaleByPixelRatio(b.offsetY),a=pointers.find(a=>a.id==-1);a==null&&(a=new pointerPrototype),updatePointerDownData(a,-1,c,d)}),canvas.addEventListener('mousemove',a=>{let b=pointers[0],c=scaleByPixelRatio(a.offsetX),d=scaleByPixelRatio(a.offsetY);updatePointerMoveData(b,c,d)}),window.addEventListener('mouseup',()=>{updatePointerUpData(pointers[0])}),canvas.addEventListener('touchstart',b=>{b.preventDefault();const a=b.targetTouches;while(a.length>=pointers.length)pointers.push(new pointerPrototype);for(let b=0;b<a.length;b++){let c=scaleByPixelRatio(a[b].pageX),d=scaleByPixelRatio(a[b].pageY);updatePointerDownData(pointers[b+1],a[b].identifier,c,d)}}),canvas.addEventListener('touchmove',b=>{b.preventDefault();const a=b.targetTouches;for(let b=0;b<a.length;b++){let c=pointers[b+1];if(!c.down)continue;let d=scaleByPixelRatio(a[b].pageX),e=scaleByPixelRatio(a[b].pageY);updatePointerMoveData(c,d,e)}},!1),window.addEventListener('touchend',b=>{const a=b.changedTouches;for(let b=0;b<a.length;b++){let c=pointers.find(c=>c.id==a[b].identifier);if(c==null)continue;updatePointerUpData(c)}}),window.addEventListener('keydown',a=>{a.key===' '}),document.querySelector('.clickable').onclick=function(){const a=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0),b=Math.max(document.documentElement.clientHeight||0,window.innerHeight||0);recurringCircles(100,a/2,b/2,200,10,5)};function crazyCircles(a,c,d,b,e){let f=pointers[0];for(let g=0;g<a;g++){let h=c+b*Math.cos(2*Math.PI*g/a),i=d+b*Math.sin(2*Math.PI*g/a),j=scaleByPixelRatio(h),k=scaleByPixelRatio(i);setTimeout(()=>updatePointerMoveData(f,j,k),g*e)}}function recurringCircles(a,c,d,e,b,f){crazyCircles(a,c,d,e,b);let g=setInterval(function(){crazyCircles(a,c,d,e,b)},a*b);setTimeout(function(){clearInterval(g)},a*b*f)}function crazybs(){let c=10,e=500,f=500,d=300,a=[],b=()=>Math.random()*1e3;for(let b=0;b<c;b++){let h=(e+d*Math.cos(2*Math.PI*b/c))/1e3,i=(f+d*Math.sin(2*Math.PI*b/c))/1e3;const g=generateColor();g.r*=10,g.g*=10,g.b*=10,a.push({x:h,y:i,color:g})}for(let c=0;c<a.length;c++)c===0?splat(a[c].x,a[c].y,(a[c].x+b())*(c<a.length/2?1:-1),(a[c].y+b())*(c<a.length/2?1:-1),a[c].color):splat(a[c].x,a[c].y,(a[c-1].x+b())*(c<a.length/2?1:-1),(a[c-1].y+b())*(c<a.length/2?1:-1),a[c].color)}function updatePointerDownData(a,b,c,d){a.id=b,a.down=!0,a.moved=!1,a.texcoordX=c/canvas.width,a.texcoordY=1-d/canvas.height,a.prevTexcoordX=a.texcoordX,a.prevTexcoordY=a.texcoordY,a.deltaX=0,a.deltaY=0,a.color=generateColor()}function updatePointerMoveData(a,b,c){a.prevTexcoordX=a.texcoordX,a.prevTexcoordY=a.texcoordY,a.texcoordX=b/canvas.width,a.texcoordY=1-c/canvas.height,a.deltaX=correctDeltaX(a.texcoordX-a.prevTexcoordX),a.deltaY=correctDeltaY(a.texcoordY-a.prevTexcoordY),a.moved=Math.abs(a.deltaX)>0||Math.abs(a.deltaY)>0}function updatePointerUpData(a){a.down=!1}function correctDeltaX(a){let b=canvas.width/canvas.height;return b<1&&(a*=b),a}function correctDeltaY(a){let b=canvas.width/canvas.height;return b>1&&(a/=b),a}function generateColor(){let a=HSVtoRGB(Math.random(),1,1);return a.r*=.15,a.g*=.15,a.b*=.15,a}function HSVtoRGB(k,i,a){let b,c,d,h,j,e,f,g;switch(h=Math.floor(k*6),j=k*6-h,e=a*(1-i),f=a*(1-j*i),g=a*(1-(1-j)*i),h%6){case 0:b=a,c=g,d=e;break;case 1:b=f,c=a,d=e;break;case 2:b=e,c=a,d=g;break;case 3:b=e,c=f,d=a;break;case 4:b=g,c=e,d=a;break;case 5:b=a,c=e,d=f;break}return{r:b,g:c,b:d}}function normalizeColor(a){let b={r:a.r/255,g:a.g/255,b:a.b/255};return b}function wrap(c,a,d){let b=d-a;return b==0?a:(c-a)%b+a}function getResolution(b){let a=gl.drawingBufferWidth/gl.drawingBufferHeight;a<1&&(a=1/a);let c=Math.round(b),d=Math.round(b*a);return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:d,height:c}:{width:c,height:d}}function scaleByPixelRatio(a){let b=window.devicePixelRatio||1;return Math.floor(a*b)}function hashCode(b){if(b.length==0)return 0;let a=0;for(let c=0;c<b.length;c++)a=(a<<5)-a+b.charCodeAt(c),a|=0;return a}