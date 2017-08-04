import { CommandMetadata, Command } from '../command';
import { Namespace } from '../namespace';

describe('@ionic/cli-utils', () => {

  describe('Namespace', () => {

    class MyNamespace extends Namespace {
      root = true;
      name = 'my';
    }

    class FooNamespace extends Namespace {
      name = 'foo';
    }

    @CommandMetadata({
      name: 'foo',
      type: 'global',
      description: '',
    })
    class FooCommand extends Command {}

    @CommandMetadata({
      name: 'bar',
      type: 'global',
      description: '',
    })
    class BarCommand extends Command {}

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
