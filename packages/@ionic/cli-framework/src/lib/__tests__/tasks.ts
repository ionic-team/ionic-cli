import { Task, TaskChain } from '../tasks';

describe('@ionic/cli-framework', () => {

  describe('lib/tasks', () => {

    describe('Task', () => {

      let task: Task;
      let handlers: {
        success: jest.Mock;
        failure: jest.Mock;
        clear: jest.Mock;
        tick: jest.Mock;
        end: jest.Mock;
      };

      beforeEach(() => {
        jest.useFakeTimers();
        task = new Task({ msg: '' });
        handlers = {
          success: jest.fn(),
          failure: jest.fn(),
          clear: jest.fn(),
          tick: jest.fn(),
          end: jest.fn(),
        };
        task.on('success', handlers.success);
        task.on('failure', handlers.failure);
        task.on('clear', handlers.clear);
        task.on('tick', handlers.tick);
        task.on('end', handlers.end);
      });

      afterEach(() => {
        jest.clearAllTimers();
      });

      it('should have an empty msg from construction', () => {
        expect(task.msg).toEqual('');
      });

      it('should tick when msg is set', () => {
        const msg = 'hello world!';
        task.msg = msg;
        expect(handlers.tick).toHaveBeenCalledTimes(1);
        handlers.tick.mockReset();
        expect(task.msg).toEqual(msg);
        expect(handlers.tick).not.toHaveBeenCalled();
      });

      it('should allow start to be called more than once', () => {
        expect(task.running).toEqual(false);
        task.start();
        expect(task.running).toEqual(true);
        expect(handlers.tick).not.toHaveBeenCalled();
        task.start();
        expect(task.running).toEqual(true);
        expect(handlers.tick).not.toHaveBeenCalled();
      });

      it('should end with proper events', () => {
        expect(handlers.tick).not.toHaveBeenCalled();
        expect(handlers.clear).not.toHaveBeenCalled();
        expect(handlers.end).not.toHaveBeenCalled();
        task.end();
        expect(handlers.tick).toHaveBeenCalledTimes(1);
        expect(handlers.clear).toHaveBeenCalledTimes(1);
        expect(handlers.end).toHaveBeenCalledTimes(1);
        expect(handlers.success).not.toHaveBeenCalled();
        expect(handlers.failure).not.toHaveBeenCalled();
      });

      it('should ignore succeed if not started', () => {
        expect(task.running).toEqual(false);
        task.succeed();
        expect(task.running).toEqual(false);
        expect(handlers.tick).not.toHaveBeenCalled();
        expect(handlers.clear).not.toHaveBeenCalled();
        expect(handlers.end).not.toHaveBeenCalled();
        expect(handlers.success).not.toHaveBeenCalled();
        expect(handlers.failure).not.toHaveBeenCalled();
      });

      it('should ignore fail if not started', () => {
        expect(task.running).toEqual(false);
        task.fail();
        expect(task.running).toEqual(false);
        expect(handlers.tick).not.toHaveBeenCalled();
        expect(handlers.clear).not.toHaveBeenCalled();
        expect(handlers.end).not.toHaveBeenCalled();
        expect(handlers.success).not.toHaveBeenCalled();
        expect(handlers.failure).not.toHaveBeenCalled();
      });

      it('should succeed with proper events', () => {
        task.start();
        expect(task.running).toEqual(true);
        task.succeed();
        expect(task.running).toEqual(false);
        expect(handlers.tick).toHaveBeenCalledTimes(1);
        expect(handlers.clear).toHaveBeenCalledTimes(1);
        expect(handlers.end).toHaveBeenCalledTimes(1);
        expect(handlers.success).toHaveBeenCalledTimes(1);
        expect(handlers.failure).not.toHaveBeenCalled();
      });

      it('should fail with proper events', () => {
        task.start();
        expect(task.running).toEqual(true);
        task.fail();
        expect(task.running).toEqual(false);
        expect(handlers.tick).toHaveBeenCalledTimes(1);
        expect(handlers.clear).toHaveBeenCalledTimes(1);
        expect(handlers.end).toHaveBeenCalledTimes(1);
        expect(handlers.success).not.toHaveBeenCalled();
        expect(handlers.failure).toHaveBeenCalledTimes(1);
      });

      describe('intervaled', () => {

        const tickInterval = 50;

        beforeEach(() => {
          task.tickInterval = tickInterval;
        });

        it('should not set intervalId twice', () => {
          expect(task.running).toEqual(false);
          expect(task.intervalId).toBeUndefined();
          task.start();
          expect(task.running).toEqual(true);
          expect(task.intervalId).toBeDefined();
          const firstIntervalId = task.intervalId;
          task.start();
          expect(task.running).toEqual(true);
          expect(task.intervalId).toBeDefined();
          expect(task.intervalId).toBe(firstIntervalId);
        });

        it('should clear interval properly', () => {
          task.start();
          const intervalId = task.intervalId;
          expect(task.intervalId).toBeDefined();
          task.clear();
          expect(handlers.clear).toHaveBeenCalledTimes(1);
          expect(task.intervalId).toBeUndefined();
          expect(clearInterval).toHaveBeenLastCalledWith(intervalId);
        });

        it('should tick appropriately for success case', () => {
          const msg = 'hello world!';
          task.start();
          expect(setInterval).toHaveBeenCalledTimes(1);
          expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), tickInterval);
          expect(handlers.tick).not.toHaveBeenCalled();
          task.msg = msg;
          expect(handlers.tick).toHaveBeenCalledTimes(1);
          jest.advanceTimersByTime(100);
          expect(handlers.tick).toHaveBeenCalledTimes(3);
          task.succeed();
          expect(handlers.tick).toHaveBeenCalledTimes(4);
        });

      });

    });

    describe('TaskChain', () => {

      let chain: TaskChain;
      let createTaskSpy: jest.SpyInstance;
      let handlers: {
        end: jest.Mock;
        failure: jest.Mock;
        next: jest.Mock;
      };

      beforeEach(() => {
        chain = new TaskChain();
        createTaskSpy = jest.spyOn(chain, 'createTask');
        handlers = {
          end: jest.fn(),
          failure: jest.fn(),
          next: jest.fn(),
        };
        chain.on('end', handlers.end);
        chain.on('failure', handlers.failure);
        chain.on('next', handlers.next);
      });

      it('should set current task upon first next', () => {
        expect((chain as any).current).toBeUndefined();
        const msg = 'hello world!';
        const task = chain.next(msg);
        expect(task.msg).toEqual(msg);
        expect(task.running).toEqual(true);
        expect((chain as any).current).toBe(task);
      });

      it('should remove current task when complete', () => {
        expect((chain as any).current).toBeUndefined();
        const task = chain.next('hello world!');
        const spy = jest.fn();
        task.on('success', spy);
        expect((chain as any).current).toBe(task);
        chain.end();
        expect((chain as any).current).toBeUndefined();
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('should fail current task', () => {
        expect((chain as any).current).toBeUndefined();
        const task = chain.next('hello world!');
        const spy = jest.fn();
        task.on('failure', spy);
        expect((chain as any).current).toBe(task);
        chain.fail();
        expect((chain as any).current).toBe(task);
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('should pass msg to create task function', () => {
        const msg = 'hello world!';
        chain.next(msg);
        expect(createTaskSpy).toHaveBeenCalledTimes(1);
        expect(createTaskSpy).toHaveBeenLastCalledWith({ msg });
      });

      it('should cleanup tasks', () => {
        const task1 = chain.next('hello world!');
        const task2 = chain.next('hello world!');
        const clearSpy1 = jest.fn();
        const failureSpy1 = jest.fn();
        const clearSpy2 = jest.fn();
        const failureSpy2 = jest.fn();
        task1.on('clear', clearSpy1);
        task1.on('failure', failureSpy1);
        task2.on('clear', clearSpy2);
        task2.on('failure', failureSpy2);
        chain.cleanup();
        expect(failureSpy1).not.toHaveBeenCalled();
        expect(clearSpy1).toHaveBeenCalledTimes(1);
        expect(failureSpy2).toHaveBeenCalledTimes(1);
        expect(clearSpy2).toHaveBeenCalledTimes(1);
      });

      it('should call end event with no task for task-list chain', () => {
        expect(handlers.end).not.toHaveBeenCalled();
        chain.end();
        expect(handlers.end).toHaveBeenCalledTimes(1);
        expect(handlers.end).toHaveBeenCalledWith(undefined);
      });

      it('should call end event with a task', () => {
        const task = chain.next('hello world!');
        expect(handlers.end).not.toHaveBeenCalled();
        chain.end();
        expect(handlers.end).toHaveBeenCalledTimes(1);
        expect(handlers.end).toHaveBeenCalledWith(task);
      });

      it('should call failure event with no task for task-list chain', () => {
        expect(handlers.failure).not.toHaveBeenCalled();
        chain.fail();
        expect(handlers.failure).toHaveBeenCalledTimes(1);
        expect(handlers.failure).toHaveBeenCalledWith(undefined);
      });

      it('should call failure event with a task', () => {
        const task = chain.next('hello world!');
        expect(handlers.failure).not.toHaveBeenCalled();
        chain.fail();
        expect(handlers.failure).toHaveBeenCalledTimes(1);
        expect(handlers.failure).toHaveBeenCalledWith(task);
      });

      it('should call next event', () => {
        expect(handlers.next).not.toHaveBeenCalled();
        const task1 = chain.next('hello world!');
        expect(handlers.next).toHaveBeenCalledTimes(1);
        expect(handlers.next).toHaveBeenCalledWith(task1);
        const task2 = chain.next('hello world!');
        expect(handlers.next).toHaveBeenCalledTimes(2);
        expect(handlers.next).toHaveBeenCalledWith(task2);
      });

    });

  });

});
