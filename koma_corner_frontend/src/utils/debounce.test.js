import { debounce } from './debounce';

jest.useFakeTimers();

test('debounce delays invocation and calls with latest arg', () => {
  const fn = jest.fn();
  const d = debounce(fn, 200);
  d('a');
  d('b');
  expect(fn).not.toBeCalled();
  jest.advanceTimersByTime(199);
  expect(fn).not.toBeCalled();
  jest.advanceTimersByTime(1);
  expect(fn).toBeCalledTimes(1);
  expect(fn).toHaveBeenLastCalledWith('b');
});

test('debounce cancel prevents call', () => {
  const fn = jest.fn();
  const d = debounce(fn, 100);
  d('x');
  d.cancel();
  jest.advanceTimersByTime(200);
  expect(fn).not.toBeCalled();
});
