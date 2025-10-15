'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const VOXEL_SIZE = 1.4;

function addVoxel(group, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x * VOXEL_SIZE, y * VOXEL_SIZE + VOXEL_SIZE / 2, z * VOXEL_SIZE);
  group.add(mesh);
}

function createCastle() {
  const castle = new THREE.Group();
  const blockGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7c1d6,
    roughness: 0.55,
    metalness: 0.18
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b5f86,
    roughness: 0.4,
    metalness: 0.35,
    emissive: 0x1d2438,
    emissiveIntensity: 0.2
  });
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xf25f5c,
    roughness: 0.45,
    emissive: 0x350000,
    emissiveIntensity: 0.45
  });

  const baseRadius = 8;
  const wallHeight = 7;

  for (let x = -baseRadius; x <= baseRadius; x++) {
    for (let z = -baseRadius; z <= baseRadius; z++) {
      const edge = Math.max(Math.abs(x), Math.abs(z));
      const isWall = edge === baseRadius;
      const isInner = edge < baseRadius;

      if (isInner) {
        addVoxel(castle, blockGeometry, stoneMaterial, x, 0, z);
        if ((x + z) % 4 === 0) {
          addVoxel(castle, blockGeometry, accentMaterial, x, 1, z);
        }
      }

      if (isWall) {
        for (let y = 0; y < wallHeight; y++) {
          const material = y === wallHeight - 1 ? accentMaterial : stoneMaterial;
          addVoxel(castle, blockGeometry, material, x, y, z);
        }
        if (Math.abs(x) % 2 === 0 || Math.abs(z) % 2 === 0) {
          addVoxel(castle, blockGeometry, accentMaterial, x, wallHeight, z);
        }
      }
    }
  }

  const gateWidth = 3;
  for (let y = 1; y < wallHeight - 1; y++) {
    for (let x = -gateWidth; x <= gateWidth; x++) {
      const index = castle.children.findIndex((child) => {
        const { x: cx, y: cy, z: cz } = child.position;
        return (
          Math.abs(cx - x * VOXEL_SIZE) < 0.01 &&
          Math.abs(cy - (y * VOXEL_SIZE + VOXEL_SIZE / 2)) < 0.01 &&
          Math.abs(cz - baseRadius * VOXEL_SIZE) < 0.01
        );
      });
      if (index !== -1) {
        castle.children.splice(index, 1);
      }
    }
  }

  function buildTower(centerX, centerZ, height = 16, radius = 3) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const distance = Math.max(Math.abs(x), Math.abs(z));
        const absoluteX = centerX + x;
        const absoluteZ = centerZ + z;

        if (distance === radius) {
          for (let y = wallHeight; y < height; y++) {
            const material = y >= height - 2 ? accentMaterial : stoneMaterial;
            addVoxel(castle, blockGeometry, material, absoluteX, y, absoluteZ);
          }
        } else if (distance < radius) {
          for (let y = wallHeight; y < height - 3; y++) {
            addVoxel(castle, blockGeometry, stoneMaterial, absoluteX, y, absoluteZ);
          }
        }
      }
    }

    const poleHeight = height + 5;
    for (let y = height; y <= poleHeight; y++) {
      addVoxel(castle, blockGeometry, accentMaterial, centerX, y, centerZ);
    }
    addVoxel(castle, blockGeometry, flagMaterial, centerX + 1, poleHeight, centerZ);
    addVoxel(castle, blockGeometry, flagMaterial, centerX + 2, poleHeight - 1, centerZ);
  }

  const towerPositions = [
    [baseRadius, baseRadius],
    [-baseRadius, baseRadius],
    [baseRadius, -baseRadius],
    [-baseRadius, -baseRadius]
  ];
  towerPositions.forEach(([x, z]) => buildTower(x, z));

  const keepRadius = 3;
  const keepHeight = 13;
  for (let x = -keepRadius; x <= keepRadius; x++) {
    for (let z = -keepRadius; z <= keepRadius; z++) {
      const distance = Math.max(Math.abs(x), Math.abs(z));
      for (let y = 0; y < keepHeight; y++) {
        const material = y >= keepHeight - 2 ? accentMaterial : stoneMaterial;
        if (distance <= keepRadius - 1 || y < keepHeight - 3) {
          addVoxel(castle, blockGeometry, material, x, y + 2, z);
        }
      }
    }
  }

  return castle;
}

function createHouse(group, blockGeometry, wallMaterial, roofMaterial, accentMaterial, options) {
  const { cx, cz, width, depth, levels } = options;
  for (let x = -width; x <= width; x++) {
    for (let z = -depth; z <= depth; z++) {
      const edge =
        Math.abs(x) === width ||
        Math.abs(z) === depth ||
        (Math.abs(x) === width - 1 && Math.abs(z) === depth - 1);
      for (let y = 0; y < levels; y++) {
        const material = edge ? wallMaterial : accentMaterial;
        addVoxel(group, blockGeometry, material, cx + x, y + 1, cz + z);
      }
    }
  }

  for (let layer = 0; layer < levels; layer++) {
    const roofY = levels + layer + 1;
    for (let x = -(width - layer); x <= width - layer; x++) {
      for (let z = -(depth - layer); z <= depth - layer; z++) {
        addVoxel(group, blockGeometry, roofMaterial, cx + x, roofY, cz + z);
      }
    }
  }

  const accentHeight = Math.round(levels / 2) + 1;
  addVoxel(group, blockGeometry, accentMaterial, cx, accentHeight, cz + depth + 1);
  addVoxel(group, blockGeometry, accentMaterial, cx, accentHeight, cz - depth - 1);
}

function createVillage() {
  const village = new THREE.Group();
  const blockGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9c7a6,
    roughness: 0.75,
    metalness: 0.1
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xb44b50,
    roughness: 0.45,
    metalness: 0.2,
    emissive: 0x300607,
    emissiveIntensity: 0.15
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f6f47,
    roughness: 0.6,
    metalness: 0.05
  });

  const houseConfigs = [
    { cx: 16, cz: 12, width: 3, depth: 3, levels: 3 },
    { cx: -18, cz: 10, width: 3, depth: 2, levels: 3 },
    { cx: 20, cz: -12, width: 4, depth: 3, levels: 4 },
    { cx: -15, cz: -14, width: 3, depth: 2, levels: 2 },
    { cx: 8, cz: 18, width: 2, depth: 2, levels: 2 },
    { cx: -8, cz: 19, width: 2, depth: 2, levels: 3 }
  ];
  houseConfigs.forEach((config) =>
    createHouse(village, blockGeometry, wallMaterial, roofMaterial, accentMaterial, config)
  );

  const pathwayMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f6a4a,
    roughness: 0.9
  });
  const pathGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE * 0.2, VOXEL_SIZE);
  const addPathVoxel = (x, z, elevation = 0) => {
    const pathBlock = new THREE.Mesh(pathGeometry, pathwayMaterial);
    pathBlock.receiveShadow = true;
    pathBlock.position.set(x * VOXEL_SIZE, elevation + VOXEL_SIZE * 0.1, z * VOXEL_SIZE);
    village.add(pathBlock);
  };

  for (let x = -25; x <= 25; x++) {
    addPathVoxel(x, 6);
    if (x % 2 === 0) {
      addPathVoxel(x, 5, Math.sin(x * 0.2) * 0.1);
    }
  }
  for (let z = 6; z <= 25; z++) {
    addPathVoxel(-5, z);
    if (z % 3 === 0) {
      addPathVoxel(-6, z, Math.cos(z * 0.2) * 0.12);
    }
  }

  const treeMaterial = new THREE.MeshStandardMaterial({
    color: 0x327345,
    emissive: 0x1b3d24,
    emissiveIntensity: 0.2
  });
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d5a2b,
    roughness: 0.9
  });
  const treeGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

  function addTree(baseX, baseZ, height = 5) {
    for (let y = 0; y < Math.floor(height / 2); y++) {
      addVoxel(village, treeGeo, trunkMaterial, baseX, y + 1, baseZ);
    }
    for (let y = Math.floor(height / 2); y < height; y++) {
      const radius = Math.max(1, height - y);
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          if (Math.abs(x) + Math.abs(z) <= radius + 1) {
            addVoxel(village, treeGeo, treeMaterial, baseX + x, y + 1, baseZ + z);
          }
        }
      }
    }
  }

  const treePositions = [
    [22, 18, 6],
    [-22, 16, 7],
    [24, -16, 6],
    [-24, -18, 5],
    [6, 24, 4],
    [-6, 26, 5]
  ];
  treePositions.forEach(([x, z, height]) => addTree(x, z, height));

  return village;
}

function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(240, 240, 1, 1);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ba16d,
    roughness: 0.95
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.receiveShadow = true;
  ground.position.y = 0;
  return ground;
}

function createWater() {
  const waterGeometry = new THREE.PlaneGeometry(260, 260, 120, 120);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2364aa,
    transmission: 0.85,
    transparent: true,
    opacity: 0.85,
    roughness: 0.22,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.05
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.receiveShadow = true;
  water.position.y = -0.5;

  const basePositions = Float32Array.from(waterGeometry.attributes.position.array);
  const updateWater = (elapsed) => {
    const pos = waterGeometry.attributes.position;
    const array = pos.array;
    for (let i = 0; i < array.length; i += 3) {
      const x = array[i];
      const z = array[i + 2];
      const base = basePositions[i + 1];
      array[i + 1] =
        base +
        Math.sin((x + elapsed * 8) * 0.05) * 0.45 +
        Math.cos((z + elapsed * 6) * 0.05) * 0.35 +
        Math.sin((x + z + elapsed * 4) * 0.04) * 0.25;
    }
    pos.needsUpdate = true;
    waterGeometry.computeVertexNormals();
  };

  return { water, updateWater };
}

function createMistParticles() {
  const particleGeometry = new THREE.BufferGeometry();
  const count = 1200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 140 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    const height = 5 + Math.random() * 25;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    const color = new THREE.Color(0x9fc7ff);
    const intensity = 0.4 + Math.random() * 0.4;
    colors[i * 3] = color.r * intensity;
    colors[i * 3 + 1] = color.g * intensity;
    colors[i * 3 + 2] = color.b * intensity;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });

  return new THREE.Points(particleGeometry, particleMaterial);
}

export default function Home() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1a2e);
    scene.fog = new THREE.FogExp2(0x0f243a, 0.012);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x07101f, 1);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      400
    );
    camera.position.set(60, 36, 60);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.enabled = false;
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 40;
    controls.maxDistance = 140;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff0e0, 1.8);
    sunLight.position.set(45, 65, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -80;
    sunLight.shadow.camera.right = 80;
    sunLight.shadow.camera.top = 80;
    sunLight.shadow.camera.bottom = -80;
    sunLight.shadow.radius = 4;
    scene.add(sunLight);

    const moonLight = new THREE.PointLight(0x8bb7ff, 0.8, 180, 2);
    moonLight.position.set(-80, 40, -80);
    scene.add(moonLight);

    const rimLight = new THREE.SpotLight(0x7ec8ff, 1.4, 200, Math.PI / 5, 0.4, 1);
    rimLight.position.set(-60, 55, 20);
    rimLight.target.position.set(0, 10, 0);
    rimLight.castShadow = true;
    rimLight.shadow.bias = -0.0001;
    scene.add(rimLight);
    scene.add(rimLight.target);

    const ground = createGround();
    scene.add(ground);

    const { water, updateWater } = createWater();
    scene.add(water);

    const castle = createCastle();
    scene.add(castle);

    const village = createVillage();
    scene.add(village);

    const mist = createMistParticles();
    scene.add(mist);

    const heroFocus = new THREE.Vector3(0, 12, 0);
    controls.target.copy(heroFocus);

    const clock = new THREE.Clock();
    let animationId = 0;

    const orbitOffset = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();

    const handleResize = () => {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      updateWater(elapsed);

      mist.rotation.y += 0.0003;

      const cinematicRadius = 90;
      const verticalWave = Math.sin(elapsed * 0.35) * 6 + 34;
      camera.position.x = Math.cos(elapsed * 0.12) * cinematicRadius;
      camera.position.z = Math.sin(elapsed * 0.12) * (cinematicRadius * 0.85);
      camera.position.y += (verticalWave - camera.position.y) * 0.02;

      orbitOffset.set(Math.cos(elapsed * 0.5) * 8, Math.sin(elapsed * 0.35) * 1.5, Math.sin(elapsed * 0.5) * 8);
      lookTarget.copy(heroFocus).addScaledVector(orbitOffset, 0.25);
      camera.lookAt(lookTarget);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      blockCleanup(scene);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <main>
      <div className="canvas-container" ref={containerRef}>
        <div className="overlay">
          <h1>Citadel of Voxels</h1>
          <p>
            Glide through a handcrafted voxel kingdom where a grand castle watches over a lively
            coastal village. Let the shimmering waters and floating mist set the tone for an
            evocative cinematic journey.
          </p>
        </div>
      </div>
    </main>
  );
}

function blockCleanup(object3D) {
  const geometries = new Set();
  const materials = new Set();

  object3D.traverse((child) => {
    if (child.isMesh) {
      geometries.add(child.geometry);
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material && materials.add(material));
      } else if (child.material) {
        materials.add(child.material);
      }
    }
  });

  geometries.forEach((geometry) => {
    if (geometry && geometry.dispose) {
      geometry.dispose();
    }
  });

  materials.forEach((material) => {
    if (material && material.dispose) {
      material.dispose();
    }
  });
}
