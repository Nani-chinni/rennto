import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Easing, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useNetwork } from '../hooks/useNetwork';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../theme/colors';

const { width } = Dimensions.get('window');

export default function OfflineScreen() {
  const { isConnected } = useNetwork();
  const [checking, setChecking] = useState(false);
  const insets = useSafeAreaInsets();
  
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [spinAnim] = useState(() => new Animated.Value(0));

  // We manage our own visibility state to allow fade-out before unmounting
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -12,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isConnected]);

  useEffect(() => {
    if (checking) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
      spinAnim.stopAnimation();
    }
  }, [checking]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const checkConnection = async () => {
    if (checking) return;
    setChecking(true);
    await NetInfo.fetch();
    setTimeout(() => {
      setChecking(false);
    }, 800);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#FFFFFF', '#F8F5FF']}
          style={styles.gradient}
        />
        
        {/* Abstract Glow Background Effects */}
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={[styles.content, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
          
          {/* Header */}
          <View style={[styles.header, { top: Math.max(insets.top, 20) }]}>
            <View style={styles.logoContainer}>
              <Ionicons name="home" size={20} color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.brandName}>Rennto</Text>
          </View>

          <View style={styles.spacer} />

          {/* Main Illustration Area */}
          <Animated.View style={[styles.illustrationContainer, { transform: [{ translateY: floatAnim }] }]}>
            <View style={styles.glassCircle}>
              <Ionicons name="home-outline" size={72} color={COLORS.PRIMARY} style={styles.houseIcon} />
              
              <Animated.View style={[styles.wifiIconContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.wifiIconBackground}>
                  <Ionicons name="cloud-offline" size={28} color="#EF4444" />
                </View>
              </Animated.View>
            </View>
            
            {/* Particles */}
            <View style={[styles.particle, styles.particle1]} />
            <View style={[styles.particle, styles.particle2]} />
            <View style={[styles.particle, styles.particle3]} />
            <View style={[styles.particle, styles.particle4]} />
          </Animated.View>

          <View style={styles.spacer} />

          {/* Main Text Content */}
          <Text style={styles.title}>You're Offline</Text>
          <Text style={styles.subtitle}>
            It looks like your internet connection is unavailable.{'\n'}Check your network and try again.
          </Text>

          {/* Connection Status Indicator */}
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>No Internet Connection</Text>
          </View>

          <View style={styles.spacerLarge} />

          {/* Try Again Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%', paddingHorizontal: 24 }}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPressIn={handlePressIn} 
              onPressOut={handlePressOut}
              onPress={checkConnection}
              disabled={checking}
            >
              <LinearGradient
                colors={[COLORS.PRIMARY_LIGHT, COLORS.PRIMARY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="refresh" size={20} color="#FFF" style={styles.buttonIcon} />
                </Animated.View>
                <Text style={styles.buttonText}>{checking ? "Checking..." : "Try Again"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footerText}>
            Make sure Wi-Fi or mobile data is turned on.
          </Text>
          
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(122, 63, 196, 0.12)',
    transform: [{ scaleX: 1.5 }],
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(95, 37, 159, 0.12)',
    transform: [{ scaleX: 1.5 }],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(122, 63, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.5,
  },
  spacer: {
    flex: 1,
  },
  spacerLarge: {
    flex: 1.5,
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 40,
  },
  glassCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    shadowColor: '#5F259F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  houseIcon: {
    opacity: 0.9,
  },
  wifiIconContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
  },
  wifiIconBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(122, 63, 196, 0.15)',
  },
  particle1: {
    width: 16, height: 16,
    top: 20, left: 10,
  },
  particle2: {
    width: 24, height: 24,
    top: 40, right: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  particle3: {
    width: 12, height: 12,
    bottom: 30, left: -10,
  },
  particle4: {
    width: 8, height: 8,
    bottom: 10, right: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    shadowColor: '#5F259F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerText: {
    marginTop: 20,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
