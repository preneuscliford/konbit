import React, {
  ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { LayoutChangeEvent, StyleSheet } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { CheckCircle, AlertCircle, Info } from "lucide-react-native";

type ToastType = "info" | "success" | "error";

export interface ToastHandles {
  show: (
    text: string,
    type: ToastType,
    visibleDuration: number,
    animationDuration?: number,
  ) => void;
  hide: (callback?: () => void) => void;
}
const Toast = React.forwardRef<ToastHandles, {}>(
  (_, ref: ForwardedRef<ToastHandles>) => {
    const [textWidth, setTextWidth] = useState(0);
    const [toastHeight, setToastHeight] = useState(0);
    const [config, setConfig] = useState<{
      text?: string;
      type?: ToastType;
      duration?: number;
    }>({});

    const isVisible = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transY = useSharedValue(-100);
    const transX = useSharedValue(0);

    const iconMap = useMemo(
      () => ({
        success: <CheckCircle size={16} color="#fff" />,
        error: <AlertCircle size={16} color="#fff" />,
        info: <Info size={16} color="#fff" />,
      }),
      [],
    );

    const colorMap = useMemo(
      () => ({
        success: "#10b981",
        error: "#ef4444",
        info: "#0077ed",
      }),
      [],
    );

    const show = useCallback(
      (text: string, type: ToastType, duration = 2000) => {
        setConfig({ text, type, duration });
      },
      [],
    );

    const hide = useCallback(
      (callback?: () => void) => {
        transY.value = withTiming(-toastHeight, { duration: 300 }, () =>
          runOnJS(reset)(callback),
        );
      },
      [toastHeight],
    );

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const reset = (callback?: () => void) => {
      setConfig({});
      isVisible.current = false;
      callback?.();
    };

    const containerStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: transY.value }],
      opacity: interpolate(
        transY.value,
        [-toastHeight, 20],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }));

    const iconStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: transX.value }],
    }));

    useEffect(() => {
      if (config.text && toastHeight) {
        isVisible.current = true;
        transX.value = textWidth + 8;
        transY.value = withTiming(20, { duration: 300 });
        transX.value = withDelay(300, withTiming(0, { duration: 300 }));

        timer.current = setTimeout(() => hide(), config.duration);
      }
      return () => {
        if (timer.current) {
          clearTimeout(timer.current);
        }
      };
    }, [config, toastHeight, textWidth]);

    return (
      <Animated.View
        style={[styles.container, containerStyle]}
        onLayout={(e) => setToastHeight(e.nativeEvent.layout.height)}
      >
        {config.text && (
          <Animated.View
            style={[
              styles.content,
              { backgroundColor: colorMap[config.type!] },
            ]}
          >
            <Animated.View style={iconStyle}>
              {iconMap[config.type!]}
            </Animated.View>
            <Animated.Text
              onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
              style={styles.text}
            >
              {config.text}
            </Animated.Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: "0%",
    right: "0%",
    alignItems: "center",
    zIndex: 1000,
  },
  content: {
    flexDirection: "row",

    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderRadius: 24,
    marginHorizontal: 8,
  },
  text: {
    color: "white",
    fontSize: 12,
    marginLeft: 8,
    flexShrink: 1,
    lineHeight: 16,
  },
});

export default Toast;
