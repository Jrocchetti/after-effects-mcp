import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as schemas from '@modelcontextprotocol/sdk/types.js';
import * as generators from './ae-integration/scriptGenerator.js';
import * as errors from './ae-integration/errorHandler.js';

type Handler = (request: any) => Promise<any>;
type Tool = { name: string; inputSchema: any; generator: (params: any) => string };

// Load the real registration/handler code with only the transport and AE IPC
// mocked. This exercises dispatch without starting AE or creating command files.
function createServer() {
  const handlers = new Map<unknown, Handler>();
  const scripts: string[] = [];
  class Server {
    setRequestHandler(schema: unknown, handler: Handler) { handlers.set(schema, handler); }
    async connect() {}
  }
  class FileCommunicator {
    async executeScript(script: string) {
      new vm.Script(script);
      scripts.push(script);
      return { success: true, data: { accepted: true } };
    }
  }
  const modules: Record<string, unknown> = {
    '@modelcontextprotocol/sdk/server/index.js': { Server },
    '@modelcontextprotocol/sdk/server/stdio.js': { StdioServerTransport: class {} },
    '@modelcontextprotocol/sdk/types.js': schemas,
    './ae-integration/file-communicator.js': { FileCommunicator },
    './ae-integration/scriptGenerator.js': generators,
    './ae-integration/errorHandler.js': errors
  };
  const source = readFileSync(new URL('./stdio-server.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source + '\nexport { TOOLS };', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const exports: { TOOLS?: Tool[] } = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name: string) {
      assert.ok(name in modules, 'Unexpected module dependency: ' + name);
      return modules[name];
    },
    console: { error() {} },
    process: { exit(code: number) { throw new Error('Unexpected server exit: ' + code); } }
  });
  return {
    tools: exports.TOOLS!,
    scripts,
    list: () => handlers.get(schemas.ListToolsRequestSchema)!({}),
    call: (name: string, args: unknown) => handlers.get(schemas.CallToolRequestSchema)!({
      params: { name, arguments: args }
    })
  };
}

describe('MCP tool registration and dispatch', () => {
  it('registers every generator exactly once with a matching name', async () => {
    const server = createServer();
    const { tools } = await server.list();
    assert.equal(tools.length, 102);
    assert.equal(new Set(tools.map((tool: Tool) => tool.name)).size, tools.length);
    const normalized = (name: string) => name.replace(/_/g, '').toLowerCase();
    for (const [name, generate] of Object.entries(generators)) {
      if (!name.startsWith('generate')) continue;
      const matches = server.tools.filter(tool => tool.generator === generate);
      assert.equal(matches.length, 1, name + ' must have exactly one registration');
      assert.equal(normalized('generate' + matches[0].name), normalized(name));
    }
    for (const tool of server.tools) {
      assert.equal(typeof tool.generator, 'function', tool.name);
      for (const required of tool.inputSchema.required ?? []) {
        assert.ok(required in tool.inputSchema.properties, tool.name + '.' + required);
      }
    }
  });

  const vertices = [[0, 0], [100, 0], [50, 100]];
  const cases: Record<string, object> = {
    create_path: { vertices },
    get_path: {},
    set_path_keyframes: { keyframes: [{ time: 0, vertices }] },
    add_shape_operator: { operator: 'trimPaths', properties: { end: 50 } },
    add_mask: { vertices },
    list_masks: {},
    get_mask_path: {},
    set_mask_path: { vertices },
    set_mask_keyframes: { keyframes: [{ time: 0, vertices }] },
    set_mask_properties: { opacity: 50, locked: true },
    delete_mask: {},
    add_to_render_queue: { outputPath: '/tmp/output.mov' },
    list_render_queue: {},
    list_render_templates: {},
    set_render_queue_item: { itemIndex: 1, render: false },
    remove_from_render_queue: { itemIndex: 1 },
    control_render: { action: 'showWindow' },
    queue_in_ame: { renderImmediately: false },
    set_comp_renderer: { renderer: 'classic' },
    get_3d_info: {},
    set_3d_layer: { position: [0, 0, 0] },
    set_material_options: { acceptsLights: true },
    set_geometry_options: { extrusionDepth: 10 },
    set_camera_options: { zoom: 1000 },
    set_light_options: { intensity: 100 },
    list_project_items: {},
    set_active_composition: { compName: 'Test' },
    set_proxy: { itemId: 1, proxyPath: '/tmp/proxy.png' },
    remove_proxy: { itemId: 1 },
    get_current_time: {},
    set_current_time: { time: 1 },
    snap_to_marker: { markerIndex: 1 },
    get_nearest_marker: { time: 1 },
    navigate_markers: { direction: 'next' },
    batch_set_expressions: { expressions: [{ property: 'ADBE Transform Group/ADBE Rotate Z', expression: 'time' }] }
  };
  for (const [name, args] of Object.entries(cases)) {
    it(`${name} dispatches to a syntactically valid script`, async () => {
      const server = createServer();
      const params: Record<string, unknown> = { compName: 'Test', layerIndex: 1, ...args };
      const tool = server.tools.find(tool => tool.name === name)!;
      for (const required of tool.inputSchema.required ?? []) {
        assert.ok(required in params, name + ' fixture missing ' + required);
      }
      const result = await server.call(name, params);
      assert.equal(result.isError, false, JSON.stringify(result));
      assert.equal(server.scripts.length, 1);
      assert.equal(JSON.parse(result.content[0].text).data.accepted, true);
    });
  }

  it('rejects unknown tools and invalid generated inputs without contacting AE', async () => {
    const server = createServer();
    assert.equal((await server.call('unknown_tool', {})).isError, true);
    assert.equal((await server.call('add_shape_operator', { operator: 'invalid' })).isError, true);
    assert.equal((await server.call('scale_keyframe_timing', { scale: 0 })).isError, true);
    assert.equal(server.scripts.length, 0);
  });
});
