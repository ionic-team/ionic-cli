import { Command } from '../command';
import { CommandMap, Namespace } from '../namespace';

describe('@ionic/cli-framework', () => {

  describe('lib/namespace', () => {

    describe('CommandMap', () => {

      class FooCommand extends Command {
        metadata = {
          name: 'foo',
          type: 'global',
          description: '',
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

      class MyNamespace extends Namespace {
        root = true;

        metadata = { name: 'my' };
      }

      class FooNamespace extends Namespace {
        metadata = { name: 'foo' };
      }

      class FooCommand extends Command {
        metadata = {
          name: 'foo',
          type: 'global',
          description: '',
        }
      }

      class BarCommand extends Command {
        metadata = {
          name: 'bar',
          type: 'global',
          description: '',
        }
      }

      describe('locate', () => {

        it('should locate root namespace with no args', async () => {
          const ns = new MyNamespace();
          const [ depth, args, cmdOrNamespace ] = await ns.locate([]);
          expect(depth).toEqual(0);
          expect(args).toEqual([]);
          expect(ns).toBe(cmdOrNamespace);
        });

        it('should locate root namespace with args with no commands or namespaces', async () => {
          const ns = new MyNamespace();
          const [ depth, args, cmdOrNamespace ] = await ns.locate(['foo', 'bar']);
          expect(depth).toEqual(0);
          expect(args).toEqual(['foo', 'bar']);
          expect(ns).toBe(cmdOrNamespace);
        });

        it('should locate foo command', async () => {
          const ns = new MyNamespace();
          const cmd = new FooCommand();
          ns.commands.set('foo', () => cmd);
          const [ depth, args, cmdOrNamespace ] = await ns.locate(['foo']);
          expect(depth).toEqual(1);
          expect(args).toEqual([]);
          expect(cmd).toBe(cmdOrNamespace);
          expect(cmd.metadata.fullName).toEqual('foo');
        });

        it('should locate foo namespace', async () => {
          const ns = new MyNamespace();
          const foons = new FooNamespace();
          ns.namespaces.set('foo', () => foons);
          const [ depth, args, cmdOrNamespace ] = await ns.locate(['foo', 'bar']);
          expect(depth).toEqual(1);
          expect(args).toEqual(['bar']);
          expect(foons).toBe(cmdOrNamespace);
        });

        it('should locate bar command in foo namespace', async () => {
          const ns = new MyNamespace();
          const foons = new FooNamespace();
          const cmd = new BarCommand();
          foons.commands.set('bar', () => cmd);
          ns.namespaces.set('foo', () => foons);
          const [ depth, args, cmdOrNamespace ] = await ns.locate(['foo', 'bar', 'baz']);
          expect(depth).toEqual(2);
          expect(args).toEqual(['baz']);
          expect(cmd).toBe(cmdOrNamespace);
          expect(cmd.metadata.fullName).toEqual('foo bar');
        });

        it('should locate bar command in foo namespace by alias', async () => {
          const ns = new MyNamespace();
          const foons = new FooNamespace();
          const cmd = new BarCommand();
          foons.commands.set('bar', () => cmd);
          foons.commands.set('b', 'bar');
          ns.namespaces.set('foo', () => foons);
          const [ depth, args, cmdOrNamespace ] = await ns.locate(['foo', 'b', 'baz']);
          expect(depth).toEqual(2);
          expect(args).toEqual(['baz']);
          expect(cmd).toBe(cmdOrNamespace);
          expect(cmd.metadata.fullName).toEqual('foo bar');
        });

      });

    });

  });

});
