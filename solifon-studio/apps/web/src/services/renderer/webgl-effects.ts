import * as THREE from "three";

export class WebGLEffectsRenderer {
	private static instance: WebGLEffectsRenderer;
	
	private canvas: HTMLCanvasElement;
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.OrthographicCamera;
	private scene: THREE.Scene;
	private material: THREE.ShaderMaterial;
	private mesh: THREE.Mesh;
	private texture: THREE.CanvasTexture | null = null;
	
	private currentWidth = 0;
	private currentHeight = 0;

	private constructor() {
		this.canvas = document.createElement("canvas");
		
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			alpha: true,
			antialias: false,
		});
		
		this.scene = new THREE.Scene();
		
		// Orthographic camera for 2D mapping
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
		this.camera.position.z = 1;
		
		// Setup the water melt / distortion shader
		const vertexShader = `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`;

		const fragmentShader = `
			uniform float u_time;
			uniform sampler2D u_texture;
			uniform int u_effectType;
			uniform vec2 u_resolution;
			varying vec2 vUv;

			void main() {
				vec2 uv = vUv;
				
				if (u_effectType == 1) {
					// 3D Water / Melt Distortion
					float freq = 10.0;
					float amp = 0.15; // 15% distortion
					
					// UV y=0 is bottom in WebGL. Melt more at the bottom.
					float melt = smoothstep(0.9, -0.1, uv.y);
					float currentAmpX = amp * (0.5 + melt * 3.0);
					float currentAmpY = amp * (0.5 + melt * 4.0);
					
					float waveX = sin(uv.y * freq + u_time * 6.0) * currentAmpX;
					float waveY = cos(uv.x * freq + u_time * 5.0) * currentAmpY;
					
					uv.x += waveX;
					uv.y += waveY;
					
					// Sample color
					vec4 color = texture2D(u_texture, uv);
					
					// Fake 3D Lighting based on wave derivatives
					float dx = cos(uv.x * freq + u_time * 5.0) * freq * currentAmpY;
					float dy = cos(uv.y * freq + u_time * 6.0) * freq * currentAmpX;
					
					// If the pixel is opaque, apply 3D lighting
					if (color.a > 0.05) {
						vec3 normal = normalize(vec3(-dx * 5.0, -dy * 5.0, 1.0));
						vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
						float diffuse = max(dot(normal, lightDir), 0.0);
						
						// Ambient + Diffuse (Multiplicative so it shades white text)
						float lightIntensity = 0.3 + 0.7 * diffuse;
						color.rgb *= lightIntensity;
						
						// Specular highlight
						float specular = pow(diffuse, 16.0);
						color.rgb += vec3(0.8) * specular * color.a;
					}

					if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
						gl_FragColor = vec4(0.0);
					} else {
						gl_FragColor = color;
					}

				} else if (u_effectType == 2) {
					// Shatter / Glitch
					float block = floor(uv.y * 20.0);
					float shift = sin(block * 15.0 + u_time * 15.0) * 0.15; // 15% shift
					if (mod(block + u_time * 8.0, 5.0) < 1.0) {
						uv.x += shift;
					}
					
					vec4 color = texture2D(u_texture, uv);
					
					// Add glitch color separation
					if (color.a > 0.05 && mod(block + u_time * 8.0, 5.0) < 1.0) {
						color.r += 0.3;
						color.b += 0.2;
					}
					if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
						gl_FragColor = vec4(0.0);
					} else {
						gl_FragColor = color;
					}

				} else if (u_effectType == 3) {
					// 3D Crystal Glass
					vec2 eps = vec2(1.0 / u_resolution.x, 1.0 / u_resolution.y);
					
					// Get alpha from neighbors to compute a normal map for the text edges
					float c = texture2D(u_texture, uv).a;
					float r_alpha = texture2D(u_texture, uv + vec2(eps.x * 2.0, 0.0)).a;
					float t_alpha = texture2D(u_texture, uv + vec2(0.0, eps.y * 2.0)).a;
					
					vec3 normal = normalize(vec3(c - r_alpha, c - t_alpha, 0.05));
					
					// Rotating 3D light
					vec3 lightDir = normalize(vec3(sin(u_time * 2.0), cos(u_time * 1.5), 1.0));
					
					// Chromatic aberration (refraction based on normal)
					vec2 offsetR = normal.xy * 0.03 * (1.0 + sin(u_time));
					vec2 offsetG = normal.xy * 0.02 * (1.0 + sin(u_time));
					vec2 offsetB = normal.xy * 0.01 * (1.0 + sin(u_time));
					
					float r = texture2D(u_texture, uv + offsetR).r;
					float g = texture2D(u_texture, uv + offsetG).g;
					float b = texture2D(u_texture, uv + offsetB).b;
					
					// Specular highlight
					vec3 viewDir = vec3(0.0, 0.0, 1.0);
					vec3 reflectDir = reflect(-lightDir, normal);
					float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
					
					// Fresnel
					float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
					
					vec3 finalColor = vec3(r, g, b) + vec3(spec) + vec3(fresnel * 0.5);
					
					if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
						gl_FragColor = vec4(0.0);
					} else {
						gl_FragColor = vec4(finalColor * c, c);
					}

				} else if (u_effectType == 4) {
					// 3D Hologram Voxels
					// Create a grid of voxels
					vec2 grid = vec2(40.0, 40.0 * (u_resolution.y / u_resolution.x));
					vec2 voxelUv = floor(uv * grid) / grid;
					
					// Sample color at voxel center
					vec4 voxelColor = texture2D(u_texture, voxelUv + 0.5/grid);
					
					// Extrude towards viewer based on brightness
					float brightness = dot(voxelColor.rgb, vec3(0.299, 0.587, 0.114)) * voxelColor.a;
					
					// Parallax effect: shift UV based on brightness and time
					vec2 parallaxOffset = vec2(
						sin(u_time * 2.0 + voxelUv.y * 10.0) * 0.02,
						cos(u_time * 1.5 + voxelUv.x * 10.0) * 0.02
					) * brightness;
					
					vec4 finalColor = texture2D(u_texture, uv + parallaxOffset);
					
					// Add scanlines
					float scanline = sin(uv.y * u_resolution.y * 0.5 + u_time * 10.0) * 0.1 + 0.9;
					finalColor.rgb *= scanline;
					
					// Add hologram tint (cyan/green)
					finalColor.rgb *= vec3(0.8, 1.0, 0.9);
					
					if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
						gl_FragColor = vec4(0.0);
					} else {
						gl_FragColor = finalColor;
					}

				} else if (u_effectType == 5) {
					// 3D Black Hole Lensing
					vec2 center = vec2(0.5 + sin(u_time)*0.2, 0.5 + cos(u_time*1.3)*0.2);
					vec2 delta = uv - center;
					float dist = length(delta);
					
					// Event horizon radius
					float radius = 0.15;
					
					vec4 finalColor;
					if (dist < radius) {
						// Inside event horizon is black
						finalColor = vec4(0.0);
					} else {
						// Gravitational lensing distortion
						float force = radius / dist;
						// Spiral twist
						float angle = force * force * 5.0;
						float s = sin(angle);
						float c = cos(angle);
						
						vec2 distortedDelta = vec2(
							delta.x * c - delta.y * s,
							delta.x * s + delta.y * c
						);
						
						// Pull light inwards
						float pull = force * force * force * 0.1;
						vec2 lensedUv = center + distortedDelta * (1.0 - pull);
						
						finalColor = texture2D(u_texture, lensedUv);
						
						// Accretion disk glow around the edge
						if (dist < radius * 1.5) {
							float glow = (radius * 1.5 - dist) / (radius * 0.5);
							finalColor.rgb += vec3(1.0, 0.5, 0.2) * glow * glow;
							finalColor.a = max(finalColor.a, glow);
						}
					}
					
					if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
						gl_FragColor = vec4(0.0);
					} else if (u_effectType == 6) {
					// 3D Depth Extrusion
					vec4 frontColor = texture2D(u_texture, uv);
					
					// Вращающийся вектор 3D-выдавливания
					vec2 dir = vec2(cos(u_time * 0.9), sin(u_time * 0.9)) * 0.0035;
					
					vec4 sideColor = vec4(0.0);
					float maxDepth = 12.0;

					// Выдавливаем боковые 3D-грани назад
					for (float i = 1.0; i <= 12.0; i += 1.0) {
						vec2 sampleUV = uv - dir * i;
						vec4 layer = texture2D(u_texture, sampleUV);
						if (layer.a > 0.05) {
							float factor = 1.0 - (i / maxDepth);
							// Сине-голубой градиент объема
							vec3 edgeRGB = mix(vec3(0.05, 0.15, 0.4), vec3(0.2, 0.6, 1.0), factor);
							sideColor = vec4(edgeRGB * layer.a, layer.a * factor);
							break;
						}
					}

					// Если пиксель принадлежит передней грани текста — подсвечиваем его
					if (frontColor.a > 0.05) {
						vec3 highlightedText = frontColor.rgb + vec3(0.2); 
						gl_FragColor = vec4(highlightedText * frontColor.a, frontColor.a);
					} else {
						// Иначе отрисовываем 3D-объем
						gl_FragColor = sideColor;
					}

				} else if (u_effectType == 7) {
					// Volumetric God Rays
					int SAMPLES = 35;
					
					// Движущийся источник света над текстом
					vec2 lightPos = vec2(0.5 + sin(u_time * 0.8) * 0.2, 0.2 + cos(u_time * 0.6) * 0.1);
					vec2 delta = (uv - lightPos) * (1.0 / float(SAMPLES) * 0.5);
					vec2 currentUV = uv;
					
					vec4 baseColor = texture2D(u_texture, uv);
					vec3 lightColor = vec3(0.3, 0.7, 1.0); // Яркий небесно-голубой луч
					vec3 accumulatedRays = vec3(0.0);
					float decay = 1.0;

					for (int i = 0; i < 35; i++) {
						currentUV -= delta;
						// Считываем прозрачность букв по направлению к источнику света
						float textAlpha = texture2D(u_texture, currentUV).a;
						accumulatedRays += textAlpha * lightColor * decay;
						decay *= 0.94; // Затухание луча
					}

					accumulatedRays /= float(SAMPLES) * 0.2;

					// Смешиваем текст и объемные лучи, выходящие за его пределы
					vec3 finalRGB = baseColor.rgb + accumulatedRays;
					float finalAlpha = max(baseColor.a, clamp(length(accumulatedRays), 0.0, 1.0));

					gl_FragColor = vec4(finalRGB * finalAlpha, finalAlpha);

				} else if (u_effectType == 8) {
					// 3D Chrome Mercury
					// Волновое колыхание жидкого металла
					vec2 wave = vec2(
						sin(uv.y * 14.0 + u_time * 2.0) * 0.006,
						cos(uv.x * 14.0 + u_time * 2.0) * 0.006
					);
					
					vec4 center = texture2D(u_texture, uv + wave);
					if (center.a < 0.01) {
						gl_FragColor = vec4(0.0);
					} else {
						// Расчет нормалей для создания 3D-округлости ртутной капли
						float left  = texture2D(u_texture, uv + wave - vec2(0.006, 0.0)).a;
						float right = texture2D(u_texture, uv + wave + vec2(0.006, 0.0)).a;
						float top   = texture2D(u_texture, uv + wave + vec2(0.0, 0.006)).a;
						float bot   = texture2D(u_texture, uv + wave - vec2(0.0, 0.006)).a;

						vec3 normal = normalize(vec3(left - right, bot - top, 0.25));

						// Хромированные отражения
						vec3 lightDir = normalize(vec3(sin(u_time * 1.2), cos(u_time * 1.2), 0.7));
						float reflection = dot(normal, lightDir);
						
						// Металлический серебряный перелив
						vec3 chromeRGB = vec3(0.8, 0.85, 0.95) + vec3(0.4) * sin(reflection * 6.28 + u_time * 2.0);
						
						// Блик по контуру (Fresnel effect)
						float edge = pow(1.0 - max(normal.z, 0.0), 2.0);
						chromeRGB += vec3(edge * 0.5);

						gl_FragColor = vec4(chromeRGB * center.a, center.a);
					}

				} else if (u_effectType == 9) {
					// Pixel Dissolve
					float pixels = 60.0;
					vec2 uvPix = floor(uv * pixels) / pixels;
					vec4 color = texture2D(u_texture, uvPix);
					float noise = fract(sin(dot(uvPix, vec2(12.9898, 78.233))) * 43758.5453);
					
					// Dissolve based on time (looping 0 to 1)
					float dissolveThreshold = mod(u_time * 0.4, 1.0);
					if (noise < dissolveThreshold) {
						gl_FragColor = vec4(0.0);
					} else {
						// Add glowing edge where it's dissolving
						if (noise < dissolveThreshold + 0.1) {
							gl_FragColor = vec4(0.0, 1.0, 1.0, color.a); // Cyan glow
						} else {
							gl_FragColor = color;
						}
					}

				} else if (u_effectType == 10) {
					// Fractal Noise
					vec4 color = texture2D(u_texture, uv);
					if (color.a < 0.05) {
						gl_FragColor = vec4(0.0);
					} else {
						vec2 pos = uv * 6.0 + u_time * 0.5;
						float n = sin(pos.x) * cos(pos.y) * 0.5 + 0.5;
						n += sin(pos.y * 2.0 - u_time) * cos(pos.x * 2.0 + u_time) * 0.25;
						vec3 noiseColor = mix(vec3(0.2, 0.0, 0.8), vec3(0.0, 1.0, 0.8), n);
						
						// Add a bit of original color
						vec3 mixedColor = mix(color.rgb, noiseColor, 0.8);
						gl_FragColor = vec4(mixedColor * color.a, color.a);
					}

				} else if (u_effectType == 11) {
					// VHS Effect
					vec2 uvVHS = uv;
					
					// Slight wave distortion
					uvVHS.x += sin(uvVHS.y * 10.0 + u_time * 5.0) * 0.002;
					// Tracking noise
					float tracking = fract(sin(dot(vec2(u_time, uvVHS.y), vec2(12.9898, 78.233))) * 43758.5453);
					if (tracking > 0.95) uvVHS.x += (tracking - 0.95) * 0.2;
					
					// Chromatic Aberration
					float r = texture2D(u_texture, uvVHS + vec2(0.005, 0.0)).r;
					float g = texture2D(u_texture, uvVHS).g;
					float b = texture2D(u_texture, uvVHS - vec2(0.005, 0.0)).b;
					float a = texture2D(u_texture, uvVHS).a;
					
					vec4 color = vec4(r, g, b, a);
					
					// Scanlines
					color.rgb -= sin(uv.y * u_resolution.y * 0.5) * 0.05;
					
					// Noise
					float noise = fract(sin(dot(uv, vec2(12.9898, 78.233) + u_time)) * 43758.5453);
					color.rgb += noise * 0.1;
					
					gl_FragColor = color;
				} else if (u_effectType == 12) {
					// Chroma Key (Green Screen Removal)
					vec4 color = texture2D(u_texture, uv);
					
					// Define chroma key color (bright green)
					vec3 keyColor = vec3(0.0, 1.0, 0.0);
					
					// Convert colors to HSV or do a simple distance check in RGB
					// We'll do a simple distance check favoring green
					float diff = length(color.rgb - keyColor);
					
					// Threshold and smoothstep for soft edges
					float threshold = 0.5;
					float smoothing = 0.2;
					float alphaMod = smoothstep(threshold, threshold + smoothing, diff);
					
					// If it's mostly green, alpha becomes 0
					color.a *= alphaMod;
					
					// Spill suppression: reduce green in remaining semi-transparent pixels
					if (alphaMod < 1.0) {
						color.g = min(color.g, max(color.r, color.b));
					}
					
					gl_FragColor = color;
				} else {
					// No effect
					vec4 color = texture2D(u_texture, uv);
					if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
						gl_FragColor = vec4(0.0);
					} else {
						gl_FragColor = color;
					}
				}
			}
		`;

		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				u_time: { value: 0 },
				u_texture: { value: null },
				u_effectType: { value: 0 },
				u_resolution: { value: new THREE.Vector2(1, 1) },
			},
			transparent: true,
		});

		const geometry = new THREE.PlaneGeometry(2, 2);
		this.mesh = new THREE.Mesh(geometry, this.material);
		this.scene.add(this.mesh);
	}

	public static getInstance(): WebGLEffectsRenderer {
		if (!WebGLEffectsRenderer.instance) {
			WebGLEffectsRenderer.instance = new WebGLEffectsRenderer();
		}
		return WebGLEffectsRenderer.instance;
	}

	public process(
		source: CanvasImageSource,
		sourceWidth: number,
		sourceHeight: number,
		effectType: string,
		localTime: number,
	): HTMLCanvasElement {
		// Ensure canvas is sized correctly
		if (this.currentWidth !== sourceWidth || this.currentHeight !== sourceHeight) {
			this.currentWidth = sourceWidth;
			this.currentHeight = sourceHeight;
			this.canvas.width = sourceWidth;
			this.canvas.height = sourceHeight;
			this.renderer.setSize(sourceWidth, sourceHeight, false);
		}

		// Update or create texture from the source
		if (!this.texture || this.texture.image !== source) {
			if (this.texture) {
				this.texture.dispose();
			}
			this.texture = new THREE.CanvasTexture(source as any);
			this.texture.minFilter = THREE.LinearFilter;
			this.texture.magFilter = THREE.LinearFilter;
			this.texture.colorSpace = THREE.SRGBColorSpace; 
		}
		
		this.texture.needsUpdate = true;

		this.material.uniforms.u_texture.value = this.texture;
		this.material.uniforms.u_time.value = localTime;
		this.material.uniforms.u_resolution.value.set(sourceWidth, sourceHeight);
		
		// Map effect string to uniform int
		let effectId = 0;
		if (effectType === "3d-melt" || effectType === "liquid-warp") effectId = 1;
		if (effectType === "3d-shatter" || effectType === "cyber-glitch" || effectType === "text-shatter") effectId = 2;
		if (effectType === "3d-liquid-glass") effectId = 3;
		if (effectType === "3d-hologram-voxels") effectId = 4;
		if (effectType === "3d-black-hole") effectId = 5;
		if (effectType === "3d-parallax-extrusion") effectId = 6;
		if (effectType === "3d-god-rays") effectId = 7;
		if (effectType === "3d-mercury-fluid") effectId = 8;
		if (effectType === "pixel-dissolve") effectId = 9;
		if (effectType === "fractal-noise") effectId = 10;
		if (effectType === "vhs") effectId = 11;
		if (effectType === "chroma-key") effectId = 12;
		this.material.uniforms.u_effectType.value = effectId;

		this.renderer.render(this.scene, this.camera);
		
		return this.canvas;
	}
}
