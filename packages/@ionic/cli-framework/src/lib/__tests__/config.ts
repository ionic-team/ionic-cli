describe('@ionic/cli-framework', () => {

  describe('BaseConfig', () => {

    let Config, mockReadFileSync, mockMakeDirSync, mockWriteFileAtomicSync;

    beforeEach(() => {
      mockReadFileSync = jest.fn();
      mockMakeDirSync = jest.fn();
      mockWriteFileAtomicSync = jest.fn();
      jest.resetModules();
      jest.mock('fs', () => ({ readFileSync: mockReadFileSync }));
      jest.mock('@ionic/utils-fs', () => ({ mkdirpSync: mockMakeDirSync, writeFileAtomicSync: mockWriteFileAtomicSync }));

      const { BaseConfig } = require('../config');

      Config = class extends BaseConfig {
        provideDefaults(c) {
          return {
            defaulted: 5,
          };
        }
      };
    });

    it('should store config file path', () => {
      const config = new Config('/path/to/file');
      expect(config.p).toEqual('/path/to/file');
    });

    it('should call mkdirpSync upon setting c', () => {
      const config = new Config('/path/to/file');
      config.c = {};
      expect(mockMakeDirSync).toHaveBeenCalledTimes(1);
      expect(mockMakeDirSync).toHaveBeenCalledWith('/path/to');
    });

    it('should call writeFileAtomicSync upon setting c', () => {
      const config = new Config('/path/to/file');
      config.c = {};
      expect(mockWriteFileAtomicSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledWith('/path/to/file', '{}');
    });

    it('should call readFileSync upon getting c', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{}');
      config.c;
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/file', 'utf8');
    });

    it('should provide defaults upon getting c', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{}');
      const result = config.c;
      expect(result).toEqual({ defaulted: 5 });
    });

    it('should not override values with defaults upon getting c', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{"defaulted":10}');
      const result = config.c;
      expect(result).toEqual({ defaulted: 10 });
    });

    it('should return defaults upon ENOENT', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => { throw { code: 'ENOENT' } });
      const result = config.c;
      expect(result).toEqual({ defaulted: 5 });
    });

    it('should return defaults upon JSON syntax error', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => { throw { name: 'SyntaxError' } });
      const result = config.c;
      expect(result).toEqual({ defaulted: 5 });
    });

    it('should call clear file upon JSON syntax error', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => { throw { name: 'SyntaxError' } });
      config.c;
      expect(mockWriteFileAtomicSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledWith('/path/to/file', '');
    });

    it('should throw upon unknown error', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => { throw new Error('unknown') });
      expect(() => config.c).toThrow('unknown');
    });

    it('should get value from file', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{"foo":5}');
      const result = config.get('foo');
      expect(result).toEqual(5);
    });

    it('should get object value from file', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{"foo":{"bar":"baz"}}');
      const result = config.get('foo');
      expect(result).toEqual({ bar: 'baz' });
    });

    it('should get value from provideDefaults', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{}');
      const result = config.get('defaulted');
      expect(result).toEqual(5);
    });

    it('should get unknown value as undefined', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{}');
      const result = config.get('unknown');
      expect(result).not.toBeDefined();
    });

    it('should get value from file even with default provided', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{"foo":5}');
      const result = config.get('foo', 10);
      expect(result).toEqual(5);
    });

    it('should get default value with default provided if value in file does not exist', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{}');
      const result = config.get('foo', 10);
      expect(result).toEqual(10);
    });

    it('should set value in file', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{}');
      jest.spyOn(config, 'provideDefaults').mockImplementation(() => ({}));
      config.set('foo', 5);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledWith('/path/to/file', '{\n  "foo": 5\n}');
    });

    it('should unset value in file', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => '{"foo":5}');
      jest.spyOn(config, 'provideDefaults').mockImplementation(() => ({}));
      config.unset('foo');
      expect(mockWriteFileAtomicSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledWith('/path/to/file', '{}');
    });

  });

  describe('BaseConfig with pathPrefix', () => {

    let Config, mockReadFileSync, mockMakeDirSync, mockWriteFileAtomicSync;

    beforeEach(() => {
      mockReadFileSync = jest.fn();
      mockMakeDirSync = jest.fn();
      mockWriteFileAtomicSync = jest.fn();
      jest.resetModules();
      jest.mock('fs', () => ({ readFileSync: mockReadFileSync }));
      jest.mock('@ionic/utils-fs', () => ({ mkdirpSync: mockMakeDirSync, writeFileAtomicSync: mockWriteFileAtomicSync }));

      const { BaseConfig } = require('../config');

      Config = class extends BaseConfig {
        provideDefaults(c) {
          return {
            defaulted: 5,
          };
        }
      };
    });

    it('should provide defaults upon getting c', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{}');
      const result = config.c;
      expect(result).toEqual({ defaulted: 5 });
    });

    it('should not override values with defaults upon getting c', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{"sub":{"defaulted":10}}');
      const result = config.c;
      expect(result).toEqual({ defaulted: 10 });
    });

    it('should return defaults upon ENOENT', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => { throw { code: 'ENOENT' } });
      const result = config.c;
      expect(result).toEqual({ defaulted: 5 });
    });

    it('should return defaults upon JSON syntax error', () => {
      const config = new Config('/path/to/file');
      mockReadFileSync.mockImplementationOnce(() => { throw { name: 'SyntaxError' } });
      const result = config.c;
      expect(result).toEqual({ defaulted: 5 });
    });

    it('should call clear file upon JSON syntax error', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => { throw { name: 'SyntaxError' } });
      config.c;
      expect(mockWriteFileAtomicSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledWith('/path/to/file', '');
    });

    it('should throw upon unknown error', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => { throw new Error('unknown') });
      expect(() => config.c).toThrow('unknown');
    });

    it('should get value from file', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{"sub":{"foo":5}}');
      const result = config.get('foo');
      expect(result).toEqual(5);
    });

    it('should get value from file with many nested paths', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['foo', 'bar', 'baz'] });
      mockReadFileSync.mockImplementationOnce(() => '{"foo":{"bar":{"baz":{"prop":5}}}}');
      const result = config.get('prop');
      expect(result).toEqual(5);
    });

    it('should get object value from file', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{"sub":{"foo":{"bar":"baz"}}}');
      const result = config.get('foo');
      expect(result).toEqual({ bar: 'baz' });
    });

    it('should get value from provideDefaults', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{"sub":{}}');
      const result = config.get('defaulted');
      expect(result).toEqual(5);
    });

    it('should get value from provideDefaults if path prefix does not exist', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{}');
      const result = config.get('defaulted');
      expect(result).toEqual(5);
    });

    it('should get unknown value as undefined', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{"sub":{}}');
      const result = config.get('unknown');
      expect(result).not.toBeDefined();
    });

    it('should get value from file even with default provided', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{"sub":{"foo":5}}');
      const result = config.get('foo', 10);
      expect(result).toEqual(5);
    });

    it('should get default value with default provided if value in file does not exist', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementationOnce(() => '{"sub":{}}');
      const result = config.get('foo', 10);
      expect(result).toEqual(10);
    });

    it('should set value in file', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementation(() => '{"sub":{}}');
      jest.spyOn(config, 'provideDefaults').mockImplementation(() => ({}));
      config.set('foo', 5);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledWith('/path/to/file', '{\n  "sub": {\n    "foo": 5\n  }\n}');
    });

    it('should unset value in file', () => {
      const config = new Config('/path/to/file', { pathPrefix: ['sub'] });
      mockReadFileSync.mockImplementation(() => '{"sub":{"foo":5}}');
      jest.spyOn(config, 'provideDefaults').mockImplementation(() => ({}));
      config.unset('foo');
      expect(mockWriteFileAtomicSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileAtomicSync).toHaveBeenCalledWith('/path/to/file', '{\n  "sub": {}\n}');
    });

  });

});
