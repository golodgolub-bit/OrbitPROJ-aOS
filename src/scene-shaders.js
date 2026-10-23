export const vertex = `#version 300 es
in vec2 aPosition;out vec2 vUv;
void main(){vUv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0,1);}`;
export const blur = `#version 300 es
precision highp float;in vec2 vUv;out vec4 color;
uniform sampler2D uImage;uniform vec2 uStep;uniform bool uFlip;
void main(){vec2 uv=uFlip?vec2(vUv.x,1.0-vUv.y):vUv;color=texture(uImage,uv)*0.227027;
color+=texture(uImage,uv+uStep*1.384615)*0.316216;color+=texture(uImage,uv-uStep*1.384615)*0.316216;
color+=texture(uImage,uv+uStep*3.230769)*0.070270;color+=texture(uImage,uv-uStep*3.230769)*0.070270;}`;
export const glass = `#version 300 es
precision highp float;in vec2 vUv;out vec4 color;
const int MAX=12;
uniform sampler2D uImage;uniform sampler2D uBlurred;uniform sampler2D uMask;
uniform vec2 uSize;uniform vec2 uLight;uniform vec4 uRects[MAX];uniform vec4 uStyles[MAX];uniform vec4 uTints[MAX];
uniform int uCount;uniform int uMaskIndex;uniform float uMaskRange;uniform vec2 uMaskSize;
uniform float uMerge;uniform float uIOR;uniform float uThickness;uniform float uBevel;uniform float uDispersion;
uniform float uRoughness;uniform float uFrost;uniform float uReflection;uniform float uShadow;uniform bool uBackground;uniform bool uOpaque;
float smin(float a,float b,float k){if(k<=0.001)return min(a,b);float h=max(k-abs(a-b),0.0)/k;return min(a,b)-h*h*k*0.25;}
float shapeDistance(vec2 p,int i){
  vec4 r=uRects[i];
  if(i==uMaskIndex){vec2 uv=(p-r.xy)/(r.zw*2.0)+0.5;float scale=min(r.z*2.0/uMaskSize.x,r.w*2.0/uMaskSize.y);if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))return length(max(abs(p-r.xy)-r.zw,0.0))+uMaskRange*scale;float raw=texture(uMask,uv).r;return (raw-0.5)*2.0*uMaskRange*scale;}
  float radius=min(uStyles[i].x,min(r.z,r.w));vec2 q=abs(p-r.xy)-r.zw+radius;
  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
}
vec2 field(vec2 p){
  float best=10000.0,groupDistance=10000.0,lastGroup=-1000.0;int owner=0,groupOwner=0;
  for(int i=0;i<MAX;i++){
    if(i>=uCount)break;float opacity=uStyles[i].z;if(opacity<=0.001)continue;
    float d=shapeDistance(p,i);float group=uStyles[i].y;
    if(group!=lastGroup){if(groupDistance<best){best=groupDistance;owner=groupOwner;}groupDistance=d;groupOwner=i;lastGroup=group;}
    else {if(d<groupDistance)groupOwner=i;groupDistance=smin(groupDistance,d,uMerge*min(opacity,1.0));}
  }
  if(groupDistance<best){best=groupDistance;owner=groupOwner;}return vec2(best,float(owner));
}
vec3 raw(vec2 uv){return texture(uImage,clamp(uv,vec2(0.001),vec2(0.999))).rgb;}
vec3 frosted(vec2 uv){return texture(uBlurred,clamp(vec2(uv.x,1.0-uv.y),vec2(0.001),vec2(0.999))).rgb;}
void main(){
  vec2 uv=vec2(vUv.x,1.0-vUv.y),p=uv*uSize;vec2 f=field(p);float d=f.x;int id=int(f.y+0.5);
  vec3 backdrop=raw(uv);float opacity=uCount>0?uStyles[id].z:0.0;
  float aa=max(fwidth(d),0.7),alpha=(1.0-smoothstep(-aa,aa,d))*opacity;
  if(alpha<0.001){float shadow=exp(-max(field(p-vec2(0.0,7.0)).x,0.0)/14.0)*uShadow*opacity;float glow=exp(-max(d,0.0)/4.0)*0.035*opacity;
    color=uBackground?vec4(backdrop*(1.0-shadow)+glow,1):vec4(0);return;}
  if(uOpaque){vec3 solid=mix(vec3(.89,.92,.95),uTints[id].rgb,uTints[id].a);color=uBackground?vec4(mix(backdrop,solid,alpha),1):vec4(solid*alpha,alpha);return;}
  float delta=uMaskIndex>=0?1.7:.7;
  vec2 gradient=vec2(field(p+vec2(delta,0)).x-field(p-vec2(delta,0)).x,field(p+vec2(0,delta)).x-field(p-vec2(0,delta)).x);
  vec2 n=normalize(gradient+vec2(0.00001));float edge=1.0-smoothstep(0.0,max(uBevel,1.0),-d);
  float slope=pow(edge,1.25);vec3 normal=normalize(vec3(n*slope*1.8,1.0));
  vec3 ray=refract(vec3(0,0,-1),normal,1.0/max(uIOR,1.001));
  vec2 offset=ray.xy/max(abs(ray.z),0.15)*uThickness/uSize;
  vec2 q=uv+offset;vec3 sharp=raw(q);
  if(uDispersion>0.0){sharp.r=raw(q+offset*uDispersion).r;sharp.b=raw(q-offset*uDispersion).b;}
  vec3 blurred=frosted(q),base=mix(sharp,blurred,clamp(uFrost+uStyles[id].w,0.0,1.0));
  vec4 tint=uTints[id];base=mix(base,tint.rgb,tint.a);
  vec2 toLight=normalize(uLight*uSize-p+vec2(.001));float facing=dot(n,toLight);
  float fresnel=pow((uIOR-1.0)/(uIOR+1.0),2.0);fresnel=fresnel+(1.0-fresnel)*pow(edge,5.0);
  float spec=pow(max(facing,0.0),mix(14.0,3.0,uRoughness))*pow(edge,2.0)*uReflection;
  float innerLine=exp(-pow((-d-.85)/.7,2.0));float ridge=exp(-pow((-d-uBevel*.53)/max(uBevel*.34,1.0),2.0));
  base+=spec*.48+fresnel*.07; base-=max(-facing,0.0)*innerLine*.30;
  base+=innerLine*(.035+.18*max(facing,0.0))+ridge*(.045+.12*facing);
  color=uBackground?vec4(mix(backdrop,base,alpha),1):vec4(base*alpha,alpha);
}`;
