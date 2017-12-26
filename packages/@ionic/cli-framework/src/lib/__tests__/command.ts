import {
  Command,
  CommandMap,
  CommandMapDefault,
  Namespace,
  NamespaceMap,
  generateCommandPath,
} from '../command';

describe('@ionic/cli-framework', () => {

  describe('lib/command', () => {

    class MyNamespace extends Namespace {
      async getMetadata() {
        return { name: 'my' };
      }

      async getNamespaces() {
        return new NamespaceMap([
          ['foo': async () => new FooNamespace(this)],
          ['defns', async () => new NamespaceWithDefault(this)],
        ]);
      }
    }

    class NamespaceWithDefault extends Namespace {
      async getMetadata() {
        return { name: 'defns' };
      }

      async getCommands() {
        return new CommandMap([
          [CommandMapDefault, async () => new DefaultCommand(this)],
        ]);
      }
    }

    class FooNamespace extends Namespace {
      async getMetadata() {
        return { name: 'foo' };
      }

      async getCommands() {
        return new CommandMap([
          ['bar', async () => new BarCommand(this)],
          ['baz', async () => new BazCommand(this)],
          ['b', 'bar'],
        ]);
      }
    }

    class DefaultCommand extends Command {
      async getMetadata() {
        return { name: 'def', description: '' };
      }
    }

    class BarCommand extends Command {
      async getMetadata() {
        return { name: 'bar', description: '' };
      }
    }

    class BazCommand extends Command {
      async getMetadata() {
        return { name: 'baz', description: '' };
      }
    }

    describe('CommandMap', () => {

      class FooCommand extends Command {
        async getMetadata() {
          return {
            name: 'foo',
            type: 'global',
            description: '',
          };
        }
      }

      describe('getAliases', () => {

        it('should get empty alias map for empty command map', () => {
          const cmdmap = new CommandMap([]);
          const aliasmap = cmdmap.getAliases();
          expect(aliasmap.size).toEqual(0);
        });

        it('should get empty alias map for command map with no aliases', () => {
          const cmdmap = new CommandMap([['foo', () => {}], ['bar', () => {}]]);
          const aliasmap = cmdmap.getAliases();
          expect(aliasmap.size).toEqual(0);
        });

        it('should get alias map for command map with aliases', () => {
          const cmdmap = new CommandMap([['foo', async () => new FooCommand()], ['f', 'foo'], ['fo', 'foo']]);
          const aliasmap = cmdmap.getAliases();
          expect(aliasmap.size).toEqual(1);
          expect(aliasmap.get('foo')).toEqual(['f', 'fo']);
        });

        it('should get alias map for command map without resolved command', () => {
          const cmdmap = new CommandMap([['f', 'foo'], ['fo', 'foo']]);
          const aliasmap = cmdmap.getAliases();
          expect(aliasmap.size).toEqual(1);
          expect(aliasmap.get('foo')).toEqual(['f', 'fo']);
        });

      });

      describe('resolveAliases', () => {

        it('should return undefined for unknown command', () => {
          const cmdmap = new CommandMap([]);
          expect(cmdmap.resolveAliases('bar')).toBeUndefined();
        });

        it('should return command when immediately found', async () => {
          const cmd = new FooCommand();
          const cmdmap = new CommandMap([['foo', async () => cmd]]);
          const result = cmdmap.resolveAliases('foo');
          expect(result).toBeDefined();
          expect(await result()).toBe(cmd);
        });

      });

    });

    describe('Namespace', () => {

      describe('parent and namespace', () => {

        it('should have parent attribute', async () => {
          const testNamespace = async ns => {
            const namespaces = await ns.getNamespaces();

            for (let [ , nsgetter ] of namespaces.entries()) {
              const namespace = await nsgetter();
              expect(namespace.parent).toBe(ns);
              await testNamespace(namespace);
            }
          };

          const myns = new MyNamespace();
          await testNamespace(myns);
        });

        it('should have namespace attribute', async () => {
          const testNamespace = async ns => {
            const commands = await ns.getCommands();
            const namespaces = await ns.getNamespaces();

            for (let [ , cmdgetter ] of commands.entries()) {
              if (typeof cmdgetter === 'function') {
                const cmd = await cmdgetter();
                expect(cmd.namespace).toBe(ns);
              }
            }

            for (let [ , nsgetter ] of namespaces.entries()) {
              const namespace = await nsgetter();
              expect(namespace.parent).toBe(ns);
              await testNamespace(namespace);
            }
          };

          const myns = new MyNamespace();
          await testNamespace(myns);
        });

      });

      describe('locate', () => {

        it('should locate root namespace with no args', async () => {
          const ns = new MyNamespace();
          const { args, obj, path } = await ns.locate([]);
          expect(args).toEqual([]);
          expect(ns).toBe(obj);
          expect(path.length).toEqual(1);
          const [ ns1 ] = path;
          expect(ns1[0]).toEqual('my');
          expect(ns1[1]).toBe(ns);
        });

        it('should locate root namespace with args with no commands or namespaces', async () => {
          const ns = new MyNamespace();
          const { args, obj, path } = await ns.locate(['x', 'y', 'z']);
          expect(args).toEqual(['x', 'y', 'z']);
          expect(ns).toBe(obj);
          expect(path.length).toEqual(1);
          const [ ns1 ] = path;
          expect(ns1[0]).toEqual('my');
          expect(ns1[1]).toBe(ns);
        });

        it('should locate foo namespace', async () => {
          const ns = new MyNamespace();
          const { args, obj, path } = await ns.locate(['foo']);
          expect(args).toEqual([]);
          expect(obj).toBeInstanceOf(FooNamespace);
          const metadata = await obj.getMetadata();
          expect(metadata.name).toEqual('foo');
          expect(path.length).toEqual(2);
          const [ ns1, ns2 ] = path;
          expect(ns1[0]).toEqual('my');
          expect(ns1[1]).toBe(ns);
          expect(ns2[0]).toEqual('foo');
          expect(ns2[1]).toBeInstanceOf(FooNamespace);
        });

        it('should locate default command', async () => {
          const ns = new MyNamespace();
          const { args, obj, path } = await ns.locate(['defns']);
          expect(args).toEqual([]);
          expect(obj).toBeInstanceOf(DefaultCommand);
          const metadata = await obj.getMetadata();
          expect(metadata.name).toEqual('def');
          expect(path.length).toEqual(2);
          const [ ns1, cmd2 ] = path;
          expect(ns1[0]).toEqual('my');
          expect(ns1[1]).toBe(ns);
          expect(cmd2[0]).toEqual('defns');
          expect(cmd2[1]).toBeInstanceOf(DefaultCommand);
        });

        it('should locate bar command in foo namespace', async () => {
          const ns = new MyNamespace();
          const { args, obj, path } = await ns.locate(['foo', 'bar', 'arg1']);
          expect(args).toEqual(['arg1']);
          expect(obj).toBeInstanceOf(BarCommand);
          expect(path.length).toEqual(3);
          const [ ns1, ns2, cmd3 ] = path;
          expect(ns1[0]).toEqual('my');
          expect(ns1[1]).toBe(ns);
          expect(ns2[0]).toEqual('foo');
          expect(ns2[1]).toBeInstanceOf(FooNamespace);
          expect(cmd3[0]).toEqual('bar');
          expect(cmd3[1]).toBeInstanceOf(BarCommand);
        });

        it('should locate bar command in foo namespace by alias', async () => {
          const ns = new MyNamespace();
          const { args, obj, path } = await ns.locate(['foo', 'b', 'arg1']);
          expect(args).toEqual(['arg1']);
          expect(obj).toBeInstanceOf(BarCommand);
          expect(path.length).toEqual(3);
          const [ ns1, ns2, cmd3 ] = path;
          expect(ns1[0]).toEqual('my');
          expect(ns1[1]).toBe(ns);
          expect(ns2[0]).toEqual('foo');
          expect(ns2[1]).toBeInstanceOf(FooNamespace);
          expect(cmd3[0]).toEqual('b');
          expect(cmd3[1]).toBeInstanceOf(BarCommand);
        });

      });

      describe('getCommandMetadataList', () => {

        it('should return empty array for empty namespace', async () => {
          const ns = new Namespace();
          const result = await ns.getCommandMetadataList();
          expect(result).toEqual([]);
        });

        it('should have empty namespace path for default command', async () => {
          const ns = new NamespaceWithDefault();
          const result = await ns.getCommandMetadataList();
          expect(result.length).toEqual(1);
          expect(result[0].command).toBeInstanceOf(DefaultCommand);
          expect(result[0].namespace).toBe(ns);
          expect(result[0].path).toEqual([]);
        });

        it('should have correct path for command', async () => {
          const ns = new FooNamespace();
          const result = await ns.getCommandMetadataList();
          expect(result.length).toEqual(2);
          const [ barcmd, bazcmd ] = result;
          expect(barcmd.command).toBeInstanceOf(BarCommand);
          expect(barcmd.namespace).toBe(ns);
          expect(barcmd.path.length).toEqual(1);
          expect(barcmd.path[0][0]).toEqual('bar');
          expect(barcmd.path[0][1]).toBeInstanceOf(BarCommand);
          expect(bazcmd.command).toBeInstanceOf(BazCommand);
          expect(bazcmd.namespace).toBe(ns);
          expect(bazcmd.path.length).toEqual(1);
          expect(bazcmd.path[0][0]).toEqual('baz');
          expect(bazcmd.path[0][1]).toBeInstanceOf(BazCommand);
        });

        it('should have correct path for command in sub-namespace', async () => {
          const ns = new MyNamespace();
          const result = await ns.getCommandMetadataList();
          const bar = result.find(c => c.command instanceof BarCommand);
          expect(bar).toBeDefined();
          expect(bar.path.length).toEqual(2);
          expect(bar.path[0][0]).toEqual('foo');
          expect(bar.path[0][1]).toBeInstanceOf(FooNamespace);
          expect(bar.path[1][0]).toEqual('bar');
          expect(bar.path[1][1]).toBeInstanceOf(BarCommand);
        });

        it('should work', async () => {
          const ns = new MyNamespace();
          const result = await ns.getCommandMetadataList();
          expect(result.length).toEqual(3);
          const bar = result.find(c => c.command instanceof BarCommand);
          expect(bar).toBeDefined();
          const baz = result.find(c => c.command instanceof BazCommand);
          expect(baz).toBeDefined();
          const def = result.find(c => c.command instanceof DefaultCommand);
          expect(def).toBeDefined();
          expect(bar.aliases).toEqual(['b']);
          expect(def.aliases).toEqual([]);
          expect(baz.aliases).toEqual([]);
        });

      });

    });

    describe('generateCommandPath', () => {

      // TODO: default commands?

      it('should get path for single namespace and command', async () => {
        const ns = new FooNamespace();
        const { obj } = await ns.locate(['bar']);
        const result = await generateCommandPath(obj);
        expect(result.length).toEqual(2);
        const [ foons, barcmd ] = result;
        expect(foons).toBeDefined();
        expect(foons[0]).toEqual('foo');
        expect(foons[1]).toBe(ns);
        expect(barcmd).toBeDefined();
        expect(barcmd[0]).toEqual('bar');
        expect(barcmd[1]).toBeInstanceOf(BarCommand);
      });

      it('should work back through nested namespace', async () => {
        const ns = new MyNamespace();
        const { obj } = await ns.locate(['foo', 'bar']);
        const result = await generateCommandPath(obj);
        expect(result.length).toEqual(3);
        const [ rootns, foons, barcmd ] = result;
        expect(rootns).toEqual(['my', ns]);
        expect(foons).toBeDefined();
        expect(foons[0]).toEqual('foo');
        expect(foons[1]).toBeInstanceOf(FooNamespace);
        expect(barcmd).toBeDefined();
        expect(barcmd[0]).toEqual('bar');
        expect(barcmd[1]).toBeInstanceOf(BarCommand);
      });

    });

  });

});
