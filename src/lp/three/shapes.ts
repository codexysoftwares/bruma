import * as THREE from 'three';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/** Blob escuro com linhas de contorno (topográfico) e borda violeta/magenta. */
export function contourBlob({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }, opts: { scale?: number; x?: number; y?: number; lines?: number } = {}) {
  const uniforms = { uTime: { value: 0 }, uLines: { value: opts.lines ?? 60 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: NOISE + /* glsl */ `
      uniform float uTime; varying vec3 vN; varying vec3 vP; varying float vD; varying vec3 vView;
      float disp(vec3 p){ return snoise(p*0.9+vec3(0.,0.,uTime*0.12))*0.55 + snoise(p*2.1-uTime*0.08)*0.12; }
      void main(){
        vec3 p = position; float d = disp(normalize(p));
        vec3 np = p + normal*d;
        // normal aproximada por diferenças finitas
        vec3 t = normalize(cross(normal, vec3(0.,1.,0.)+vec3(.001))); vec3 b = normalize(cross(normal,t));
        float e=.02; vec3 pt=normalize(p+t*e); vec3 pb=normalize(p+b*e);
        vec3 a1 = pt*(1.5)+normalize(pt)*disp(pt) - np; vec3 a2 = pb*(1.5)+normalize(pb)*disp(pb) - np;
        vN = normalize(normalMatrix*normalize(cross(a1,a2)));
        if(dot(vN, normalMatrix*normal) < 0.) vN = -vN;
        vD = d;
        vec4 wp = modelMatrix*vec4(np,1.); vP = wp.xyz;
        vec4 mv = viewMatrix*wp; vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uLines; varying vec3 vN; varying vec3 vP; varying float vD; varying vec3 vView;
      void main(){
        vec3 n = normalize(vN);
        float diff = clamp(dot(n, normalize(vec3(-.4,.8,.6))),0.,1.);
        float f = pow(1.-clamp(dot(n,vView),0.,1.), 2.4);
        float coord = vP.y*uLines*0.18 + vD*uLines*0.35;
        float w = fwidth(coord);
        float line = 1.-smoothstep(0., w*1.4, abs(fract(coord)-.5)-.18);
        vec3 base = vec3(.035,.03,.05);
        vec3 lineCol = mix(vec3(.1,.09,.13), vec3(.46,.43,.54), diff);
        vec3 rim = mix(vec3(.36,.49,1.), vec3(.88,.25,.98), clamp(vP.x*.25+.5,0.,1.));
        vec3 col = base + lineCol*line*(.25+.9*diff) + rim*f*1.1;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 96), mat);
  mesh.scale.setScalar(opts.scale ?? 1);
  mesh.position.set(opts.x ?? 0, opts.y ?? 0, 0);
  scene.add(mesh);
  camera.position.z = 8;
  return {
    update: (t: number, m: { x: number; y: number }, scroll: number) => {
      uniforms.uTime.value = t;
      mesh.rotation.y = t * 0.08 + m.x * 0.35;
      mesh.rotation.x = m.y * 0.2 + scroll * 0.6;
    },
  };
}

/** Anéis brilhantes empilhados (vidro/metal violeta). */
export function glossyRings({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) {
  const group = new THREE.Group();
  const cols = ['#3d2a9e', '#5326c4', '#7B3FF2', '#9b3be0', '#B832D9', '#d0309a'];
  cols.forEach((c, i) => {
    const r = 1.9 - i * 0.24;
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.2 + i * 0.012, 48, 160),
      new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.55, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.5, iridescenceIOR: 1.6, envMapIntensity: 0.75 }),
    );
    m.position.y = i * 0.2 - 0.5;
    m.rotation.x = Math.PI / 2;
    group.add(m);
  });
  group.rotation.set(0.55, 0, -0.35);
  scene.add(group);
  const l1 = new THREE.PointLight('#E040FB', 40, 20); l1.position.set(3, 2, 4); scene.add(l1);
  const l2 = new THREE.PointLight('#5B7CFF', 40, 20); l2.position.set(-4, -1, 3); scene.add(l2);
  scene.add(new THREE.AmbientLight('#ffffff', 0.2));
  camera.position.z = 9;
  return {
    update: (t: number, m: { x: number; y: number }, scroll: number) => {
      group.children.forEach((c, i) => { c.rotation.z = t * (0.15 + i * 0.05) * (i % 2 ? -1 : 1); c.position.x = Math.sin(t * 0.6 + i) * 0.05; });
      group.rotation.y = m.x * 0.4 + scroll * 0.8;
      group.rotation.x = 0.55 + m.y * 0.15;
      group.position.y = Math.sin(t * 0.7) * 0.12;
    },
  };
}

/** Fitas violeta ondulando (faixas largas e brilhantes). */
export function ribbons({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }, count = 7) {
  const SEG = 220;
  const meshes: { mesh: THREE.Mesh; base: Float32Array; phase: number }[] = [];
  for (let k = 0; k < count; k++) {
    const pos = new Float32Array((SEG + 1) * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().lerpColors(new THREE.Color('#3b1fa8'), new THREE.Color('#B05CFF'), k / count),
      metalness: 0.65, roughness: 0.26, clearcoat: 1, side: THREE.DoubleSide, iridescence: 0.4, envMapIntensity: 0.8,
    });
    const mesh = new THREE.Mesh(g, mat);
    scene.add(mesh);
    meshes.push({ mesh, base: pos, phase: k * 0.35 });
  }
  const l1 = new THREE.PointLight('#E040FB', 60, 30); l1.position.set(2, 3, 5); scene.add(l1);
  const l2 = new THREE.PointLight('#5B7CFF', 50, 30); l2.position.set(-5, -2, 4); scene.add(l2);
  camera.position.z = 10;
  const tmp = new THREE.Vector3();
  return {
    update: (t: number, m: { x: number; y: number }, scroll: number) => {
      meshes.forEach(({ mesh, base, phase }, k) => {
        for (let i = 0; i <= SEG; i++) {
          const u = i / SEG;
          const x = (u - 0.5) * 22;
          const y = Math.sin(u * 5 + t * 0.5 + phase) * 1.3 + Math.sin(u * 2.3 - t * 0.3) * 0.8 + (k - count / 2) * 0.16 + (scroll - 0.5) * 1.5;
          const z = Math.cos(u * 4 + t * 0.4 + phase) * 1.2;
          const tw = u * 6 + t * 0.6 + phase + m.x * 0.6;
          tmp.set(0, Math.cos(tw), Math.sin(tw)).multiplyScalar(0.42);
          base.set([x, y - tmp.y, z - tmp.z, x, y + tmp.y, z + tmp.z], i * 6);
        }
        mesh.geometry.attributes.position.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      });
    },
  };
}
