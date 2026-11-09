// Screen-door fade only close to the chase camera. Keep trunks solid and
// visible; branches should never replace the player's view with a green wall.
export function cameraClearFoliage(material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying float vFoliageDistance;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvFoliageDistance = length(mvPosition.xyz);');
    shader.fragmentShader = 'varying float vFoliageDistance;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float coverage = smoothstep(440.0, 640.0, vFoliageDistance);
      float threshold = fract(dot(gl_FragCoord.xy, vec2(0.75487766, 0.56984029)));
      if (coverage < threshold) discard;`);
  };
  material.customProgramCacheKey = () => 'camera-clear-foliage-v1';
  return material;
}
