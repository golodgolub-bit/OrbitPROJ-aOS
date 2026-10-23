/** Optional snapshot renderer. WebGL2, draw on demand, no permanent frame loop. */
const vertex = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main(){vUv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}`;
const fragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 color;
uniform sampler2D uImage;
uniform vec2 uSize;
uniform vec2 uPointer;
uniform float uRadius;
uniform float uStrength;
uniform float uBlur;
uniform float uRim;
float sdf(vec2 p){vec2 q=abs(p)-(uSize*0.5-vec2(uRadius));return length(max(q,0.0))+min(max(q.x,q.y),0.0)-uRadius;}
void main(){
  vec2 p=(vUv-0.5)*uSize;
  float d=sdf(p), alpha=1.0-smoothstep(-1.0,1.0,d);
  if(alpha<=0.0){color=vec4(0.0);return;}
  vec2 n=normalize(vec2(sdf(p+vec2(0.5,0.0))-sdf(p-vec2(0.5,0.0)),sdf(p+vec2(0.0,0.5))-sdf(p-vec2(0.0,0.5)))+vec2(0.00001));
  float rim=1.0-smoothstep(0.0,uRim,-d);
  vec2 offset=n*rim*rim*uStrength/uSize;
  vec2 uv=clamp(vUv-offset,vec2(0.001),vec2(0.999));
  vec3 sampleColor=vec3(0.0);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)sampleColor+=texture(uImage,clamp(uv+vec2(float(x),float(y))*uBlur/uSize,vec2(0.001),vec2(0.999))).rgb/9.0;
  sampleColor.r=mix(sampleColor.r,texture(uImage,clamp(uv-offset*0.12,vec2(0.001),vec2(0.999))).r,rim*0.3);
  sampleColor.b=mix(sampleColor.b,texture(uImage,clamp(uv+offset*0.12,vec2(0.001),vec2(0.999))).b,rim*0.3);
  vec2 light=normalize(uPointer*uSize-p+vec2(0.001));
  float shine=pow(max(dot(n,light),0.0),5.0)*pow(rim,3.0)*0.6;
  vec3 glass=mix(sampleColor,vec3(0.89,0.95,1.0),0.12)+shine;
  color=vec4(glass*alpha,alpha);
}`;

/** Source must be a loaded image/canvas/ImageBitmap. Returns null without WebGL2. */
export function createGlassLens(canvas, source, options = {}) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const shaders = [],
    program = gl.createProgram(),
    buffer = gl.createBuffer(),
    texture = gl.createTexture();
  let disposed = false,
    lost = false;
  const settings = {
    radius: 48,
    strength: 22,
    blur: 1.5,
    rim: 38,
    pointerX: -0.3,
    pointerY: 0.6,
    ...options,
  };
  const compile = (type, code) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
  };
  const cleanup = () => {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    shaders.forEach((s) => gl.deleteShader(s));
  };
  try {
    compile(gl.VERTEX_SHADER, vertex);
    compile(gl.FRAGMENT_SHADER, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
  } catch (error) {
    cleanup();
    throw error;
  }
  const locations = Object.fromEntries(
    ["uSize", "uPointer", "uRadius", "uStrength", "uBlur", "uRim"].map((n) => [
      n,
      gl.getUniformLocation(program, n),
    ]),
  );
  const contextLost = (e) => {
    e.preventDefault();
    lost = true;
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  const check = () => {
    if (disposed) throw new Error("Glass lens disposed");
    if (lost) throw new Error("Glass lens context lost. Recreate renderer.");
  };
  const setSource = (image) => {
    check();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  };
  const render = (next = {}) => {
    check();
    Object.assign(settings, next);
    if (!Object.values(settings).every(Number.isFinite))
      throw new RangeError("Lens settings must be finite");
    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(locations.uSize, canvas.width, canvas.height);
    gl.uniform2f(locations.uPointer, settings.pointerX, settings.pointerY);
    gl.uniform1f(
      locations.uRadius,
      Math.max(
        0,
        Math.min(settings.radius, Math.min(canvas.width, canvas.height) / 2),
      ),
    );
    gl.uniform1f(locations.uStrength, Math.max(0, settings.strength));
    gl.uniform1f(locations.uBlur, Math.max(0, settings.blur));
    gl.uniform1f(locations.uRim, Math.max(1, settings.rim));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  try {
    setSource(source);
    render();
  } catch (error) {
    cleanup();
    canvas.removeEventListener("webglcontextlost", contextLost);
    throw error;
  }
  return {
    render,
    setSource,
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("webglcontextlost", contextLost);
      cleanup();
    },
  };
}
