describe('@ionic/cli-framework', () => {

  describe('lib/prompts', () => {

    describe('createPromptModule', () => {

      const mockMute = jest.fn();
      const mockClose = jest.fn();
      const mockLogStream = {};

      function setupPromptMocks({ value, tty }: { value: string; tty: boolean; }) {
        const mocktty = tty;
        const mockCreatePromptModule = () => async (question) => ({ [question.name]: value });
        mockMute.mockReset();
        mockClose.mockReset();
        jest.resetModules();
        jest.mock('../../utils/terminal', () => ({ TERMINAL_INFO: { tty: mocktty } }));
        jest.mock('inquirer', () => ({
          ui: { BottomBar: class { close = mockClose; log = mockLogStream; rl = { output: { mute: mockMute } } } },
          createPromptModule: mockCreatePromptModule,
        }));

        return require('../prompts');
      }

      it('should provide empty string for no value', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input' });
        expect(result).toEqual('');
      });

      it('should provide empty string for null value', async () => {
        const prompts = setupPromptMocks({ value: null, tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input' });
        expect(result).toEqual('');
      });

      it('should provide empty string', async () => {
        const prompts = setupPromptMocks({ value: '', tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input' });
        expect(result).toEqual('');
      });

      it('should provide string', async () => {
        const prompts = setupPromptMocks({ value: 'hello', tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input' });
        expect(result).toEqual('hello');
      });

      it('should provide boolean true', async () => {
        const prompts = setupPromptMocks({ value: true, tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'confirm' });
        expect(result).toEqual(true);
      });

      it('should provide boolean false', async () => {
        const prompts = setupPromptMocks({ value: false, tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'confirm' });
        expect(result).toEqual(false);
      });

      it('should provide array of choices', async () => {
        const prompts = setupPromptMocks({ value: ['a', 'b', 'c'], tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'checkbox' });
        expect(result).toEqual(['a', 'b', 'c']);
      });

      it('should provide string cast from number value', async () => {
        const prompts = setupPromptMocks({ value: 42, tty: true });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input' });
        expect(result).toEqual('42');
      });

      it('should provide empty string for input prompt for no value in non-tty mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: false });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input' });
        expect(result).toEqual('');
      });

      it('should provide false for confirm prompt for no value in non-tty mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: false });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'confirm' });
        expect(result).toEqual(false);
      });

      it('should provide empty array for checkbox prompt for no value in non-tty mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: false });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'checkbox' });
        expect(result).toEqual([]);
      });

      it('should provide default value for no value in non-tty mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: false });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input', default: 'hello' });
        expect(result).toEqual('hello');
      });

      it('should provide fallback value for no value and default value in non-tty mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: false });
        const prompt = await prompts.createPromptModule();
        const result = await prompt({ type: 'input', fallback: 'foo', default: 'bar' });
        expect(result).toEqual('foo');
      });

      it('should provide onFallback value for no value and no fallback and default value in non-tty mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: false });
        const prompt = await prompts.createPromptModule({ onFallback: () => 'foo' });
        const result = await prompt({ type: 'input', default: 'bar' });
        expect(result).toEqual('foo');
      });

      it('should pass question into provided onFallback in non-tty', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: false });
        const onFallbackSpy = jest.fn().mockImplementation(() => 'foo');
        const prompt = await prompts.createPromptModule({ onFallback: onFallbackSpy });
        const question = { type: 'input', default: 'bar' };
        const result = await prompt(question);
        expect(result).toEqual('foo');
        expect(onFallbackSpy).toHaveBeenCalledTimes(1);
        expect(onFallbackSpy).toHaveBeenCalledWith(question);
      });

      it('should provide empty string for input prompt for no value in non-interactive mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const prompt = await prompts.createPromptModule({ interactive: false });
        const result = await prompt({ type: 'input' });
        expect(result).toEqual('');
      });

      it('should provide false for confirm prompt for no value in non-interactive mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const prompt = await prompts.createPromptModule({ interactive: false });
        const result = await prompt({ type: 'confirm' });
        expect(result).toEqual(false);
      });

      it('should provide empty array for checkbox prompt for no value in non-interactive mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const prompt = await prompts.createPromptModule({ interactive: false });
        const result = await prompt({ type: 'checkbox' });
        expect(result).toEqual([]);
      });

      it('should provide default value for no value in non-interactive mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const prompt = await prompts.createPromptModule({ interactive: false });
        const result = await prompt({ type: 'input', default: 'hello' });
        expect(result).toEqual('hello');
      });

      it('should provide fallback value for no value and default value in non-interactive mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const prompt = await prompts.createPromptModule({ interactive: false });
        const result = await prompt({ type: 'input', fallback: 'foo', default: 'bar' });
        expect(result).toEqual('foo');
      });

      it('should provide onFallback value for no value and no fallback and default value in non-interactive mode', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const prompt = await prompts.createPromptModule({ interactive: false, onFallback: () => 'foo' });
        const result = await prompt({ type: 'input', default: 'bar' });
        expect(result).toEqual('foo');
      });

      it('should pass question into provided onFallback in non-interactive', async () => {
        const prompts = setupPromptMocks({ value: undefined, tty: true });
        const onFallbackSpy = jest.fn().mockImplementation(() => 'foo');
        const prompt = await prompts.createPromptModule({ interactive: false, onFallback: onFallbackSpy });
        const question = { type: 'input', default: 'bar' };
        const result = await prompt(question);
        expect(result).toEqual('foo');
        expect(onFallbackSpy).toHaveBeenCalledTimes(1);
        expect(onFallbackSpy).toHaveBeenCalledWith(question);
      });

      describe('open', () => {

        it('should call mute', async () => {
          const prompts = setupPromptMocks({ tty: true });
          const prompt = await prompts.createPromptModule();
          prompt.open();
          expect(mockMute).toHaveBeenCalledTimes(1);
        });

        it('should call mute once if opened multiple times', async () => {
          const prompts = setupPromptMocks({ tty: true });
          const prompt = await prompts.createPromptModule();
          prompt.open();
          prompt.open();
          prompt.open();
          expect(mockMute).toHaveBeenCalledTimes(1);
        });

      });

      describe('close', () => {

        it('should not close bottomBar if not opened', async () => {
          const prompts = setupPromptMocks({ tty: true });
          const prompt = await prompts.createPromptModule();
          prompt.close();
          expect(mockClose).not.toHaveBeenCalled();
        });

        it('should close bottomBar if opened', async () => {
          const prompts = setupPromptMocks({ tty: true });
          const prompt = await prompts.createPromptModule();
          prompt.open();
          prompt.close();
          expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should close bottomBar once if closed multiple times', async () => {
          const prompts = setupPromptMocks({ tty: true });
          const prompt = await prompts.createPromptModule();
          prompt.open();
          prompt.close();
          prompt.close();
          expect(mockClose).toHaveBeenCalledTimes(1);
        });

      });

      describe('output', () => {

        it('should get output stream from prompt module', async () => {
          const prompts = setupPromptMocks({ tty: true });
          const prompt = await prompts.createPromptModule();
          expect(prompt.output).toBeDefined();
          expect(prompt.output.stream).toBe(mockLogStream);
        });

      });

    });

  });

});
