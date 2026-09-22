import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const LANE_COUNT = 3;
const WORLD_SCALE = 1;
const CAMERA_SCALE = 1;
const DIRECTIONS = ['north', 'south', 'west', 'east'];
const CAR_COLORS = [
  '#38bdf8',
  '#f97316',
  '#a78bfa',
  '#34d399',
  '#f43f5e',
  '#facc15',
  '#fb7185',
  '#22d3ee',
];

const SPEED_LABELS = {
  stopped: 'ARRÊT',
  slow: 'RALENTI',
  normal: 'NORMAL',
  fast: 'RAPIDE',
};

const SPEED_MULTIPLIERS = {
  stopped: 0,
  slow: 0.55,
  normal: 1,
  fast: 1.6,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getAxisSign = (direction) =>
  direction === 'north' || direction === 'west' ? 1 : -1;

const isVertical = (direction) =>
  direction === 'north' || direction === 'south';

const makeGeometry = (size) => {
  const viewportSize = size;
  const roadWidth = viewportSize * 0.38;
  const visibleHalf = viewportSize / 2;
  const roadHalf = roadWidth / 2;
  const laneWidth = roadWidth / (LANE_COUNT * 2);
  const carLength = laneWidth * 1.23;
  const carWidth = laneWidth * 0.62;
  const center = size / 2;

  return {
    size,
    roadWidth,
    roadHalf,
    laneWidth,
    carLength,
    carWidth,
    center,
    visibleMin: center - visibleHalf,
    visibleMax: center + visibleHalf,
    intersectionMin: center - roadHalf,
    intersectionMax: center + roadHalf,
  };
};

const getLaneCoordinate = (direction, lanePosition, geometry) => {
  const lane = clamp(lanePosition, 0, LANE_COUNT - 1);
  const { center, roadHalf, laneWidth } = geometry;

  if (direction === 'north') {
    return center - roadHalf + laneWidth * (lane + 0.5);
  }

  if (direction === 'south') {
    return center + laneWidth * (lane + 0.5);
  }

  if (direction === 'west') {
    return center + laneWidth * (lane + 0.5);
  }

  return center - roadHalf + laneWidth * (lane + 0.5);
};

const getCarCenter = (car, geometry) => {
  const laneCoordinate = getLaneCoordinate(car.direction, car.lanePosition, geometry);

  if (isVertical(car.direction)) {
    return { x: laneCoordinate, y: car.axis };
  }

  return { x: car.axis, y: laneCoordinate };
};

const getStopAxis = (direction, geometry) => {
  const offset = geometry.carLength * 0.62;

  if (direction === 'north' || direction === 'west') {
    return geometry.center - geometry.roadHalf - offset;
  }

  return geometry.center + geometry.roadHalf + offset;
};

const isBeforeStopLine = (car, geometry) => {
  const stopAxis = getStopAxis(car.direction, geometry);
  const sign = getAxisSign(car.direction);

  return sign > 0 ? car.axis < stopAxis : car.axis > stopAxis;
};

const getCarBox = (car, geometry) => {
  const center = getCarCenter(car, geometry);
  const horizontal = !isVertical(car.direction);
  const width = horizontal ? geometry.carLength : geometry.carWidth;
  const height = horizontal ? geometry.carWidth : geometry.carLength;

  return {
    left: center.x - width / 2,
    right: center.x + width / 2,
    top: center.y - height / 2,
    bottom: center.y + height / 2,
  };
};

const boxesCollide = (a, b) => {
  const margin = 2;

  return (
    a.left + margin < b.right - margin &&
    a.right - margin > b.left + margin &&
    a.top + margin < b.bottom - margin &&
    a.bottom - margin > b.top + margin
  );
};

const findCollision = (cars, geometry) => {
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      if (boxesCollide(getCarBox(cars[i], geometry), getCarBox(cars[j], geometry))) {
        return [cars[i].id, cars[j].id];
      }
    }
  }

  return null;
};

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const createCar = (existingCars, geometry, level, id) => {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const direction = randomItem(DIRECTIONS);
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const sign = getAxisSign(direction);
    const axis =
      sign > 0
        ? geometry.visibleMin - geometry.carLength * 0.8
        : geometry.visibleMax + geometry.carLength * 0.8;

    const blocked = existingCars.some((car) => {
      if (car.direction !== direction) return false;
      if (Math.abs(car.lanePosition - lane) > 0.45) return false;
      return Math.abs(car.axis - axis) < geometry.carLength * 2.8;
    });

    if (!blocked) {
      return {
        id,
        direction,
        lane,
        lanePosition: lane,
        axis,
        speedState: 'normal',
        stopRequested: false,
        color: randomItem(CAR_COLORS),
        levelBorn: level,
      };
    }
  }

  return null;
};

function RoadScene({ size }) {
  const geometry = useMemo(() => makeGeometry(size), [size]);
  const laneLines = [];
  const segmentGap = 8;

  for (let i = 1; i < LANE_COUNT * 2; i += 1) {
    const verticalX =
      geometry.center - geometry.roadHalf + geometry.laneWidth * i;
    const horizontalY =
      geometry.center - geometry.roadHalf + geometry.laneWidth * i;
    const isCenterLine = i === LANE_COUNT;
    const color = isCenterLine ? '#eab308' : 'rgba(255,255,255,0.27)';
    const thickness = isCenterLine ? 2 : 1;

    laneLines.push(
      <React.Fragment key={'vertical-' + i}>
        <View
          style={[
            styles.laneLine,
            {
              left: verticalX - thickness / 2,
              top: 0,
              width: thickness,
              height: geometry.intersectionMin - segmentGap,
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.laneLine,
            {
              left: verticalX - thickness / 2,
              top: geometry.intersectionMax + segmentGap,
              width: thickness,
              height: size - geometry.intersectionMax - segmentGap,
              backgroundColor: color,
            },
          ]}
        />
      </React.Fragment>
    );

    laneLines.push(
      <React.Fragment key={'horizontal-' + i}>
        <View
          style={[
            styles.laneLine,
            {
              left: 0,
              top: horizontalY - thickness / 2,
              width: geometry.intersectionMin - segmentGap,
              height: thickness,
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.laneLine,
            {
              left: geometry.intersectionMax + segmentGap,
              top: horizontalY - thickness / 2,
              width: size - geometry.intersectionMax - segmentGap,
              height: thickness,
              backgroundColor: color,
            },
          ]}
        />
      </React.Fragment>
    );
  }

  return (
    <>
      <View style={[styles.grass, StyleSheet.absoluteFill]} />

      <View
        style={[
          styles.road,
          {
            left: geometry.center - geometry.roadHalf,
            top: 0,
            width: geometry.roadWidth,
            height: size,
          },
        ]}
      />

      <View
        style={[
          styles.road,
          {
            left: 0,
            top: geometry.center - geometry.roadHalf,
            width: size,
            height: geometry.roadWidth,
          },
        ]}
      />

      {laneLines}

      <View
        style={[
          styles.intersection,
          {
            left: geometry.intersectionMin,
            top: geometry.intersectionMin,
            width: geometry.roadWidth,
            height: geometry.roadWidth,
          },
        ]}
      />

      <View
        style={[
          styles.stopLine,
          {
            left: geometry.center - geometry.roadHalf,
            top: geometry.intersectionMin - 3,
            width: geometry.roadHalf,
            height: 4,
          },
        ]}
      />
      <View
        style={[
          styles.stopLine,
          {
            left: geometry.center,
            top: geometry.intersectionMax - 1,
            width: geometry.roadHalf,
            height: 4,
          },
        ]}
      />
      <View
        style={[
          styles.stopLine,
          {
            left: geometry.intersectionMin - 3,
            top: geometry.center,
            width: 4,
            height: geometry.roadHalf,
          },
        ]}
      />
      <View
        style={[
          styles.stopLine,
          {
            left: geometry.intersectionMax - 1,
            top: geometry.center - geometry.roadHalf,
            width: 4,
            height: geometry.roadHalf,
          },
        ]}
      />

      <Text
        style={[
          styles.roadWord,
          {
            left: geometry.center - geometry.roadHalf + 5,
            top: geometry.intersectionMin - 34,
            transform: [{ rotate: '90deg' }],
          },
        ]}
      >
        STOP
      </Text>
      <Text
        style={[
          styles.roadWord,
          {
            left: geometry.center + 6,
            top: geometry.intersectionMax + 10,
            transform: [{ rotate: '-90deg' }],
          },
        ]}
      >
        STOP
      </Text>
      <Text
        style={[
          styles.yieldWord,
          {
            left: geometry.intersectionMin - 60,
            top: geometry.center + 8,
          },
        ]}
      >
        CÉDEZ
      </Text>
      <Text
        style={[
          styles.yieldWord,
          {
            left: geometry.intersectionMax + 10,
            top: geometry.center - 30,
            transform: [{ rotate: '180deg' }],
          },
        ]}
      >
        CÉDEZ
      </Text>

      <View
        style={[
          styles.cornerPatch,
          {
            left: 0,
            top: 0,
            width: geometry.intersectionMin,
            height: geometry.intersectionMin,
          },
        ]}
      />
      <View
        style={[
          styles.cornerPatch,
          {
            right: 0,
            top: 0,
            width: size - geometry.intersectionMax,
            height: geometry.intersectionMin,
          },
        ]}
      />
      <View
        style={[
          styles.cornerPatch,
          {
            left: 0,
            bottom: 0,
            width: geometry.intersectionMin,
            height: size - geometry.intersectionMax,
          },
        ]}
      />
      <View
        style={[
          styles.cornerPatch,
          {
            right: 0,
            bottom: 0,
            width: size - geometry.intersectionMax,
            height: size - geometry.intersectionMax,
          },
        ]}
      />
    </>
  );
}

function Car({ car, size, onGesture, crashed }) {
  const startPoint = useRef({ x: 0, y: 0 });
  const geometry = useMemo(() => makeGeometry(size), [size]);
  const center = getCarCenter(car, geometry);
  const horizontal = !isVertical(car.direction);
  const width = horizontal ? geometry.carLength : geometry.carWidth;
  const height = horizontal ? geometry.carWidth : geometry.carLength;
  const stateColor =
    car.speedState === 'stopped'
      ? '#ef4444'
      : car.speedState === 'slow'
        ? '#f59e0b'
        : car.speedState === 'fast'
          ? '#22d3ee'
          : 'rgba(255,255,255,0.72)';

  return (
    <View
      hitSlop={14}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        startPoint.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        };
      }}
      onResponderRelease={(event) => {
        onGesture(
          car.id,
          event.nativeEvent.pageX - startPoint.current.x,
          event.nativeEvent.pageY - startPoint.current.y
        );
      }}
      style={[
        styles.carTouch,
        {
          left: center.x - Math.max(width, 40) / 2,
          top: center.y - Math.max(height, 40) / 2,
          width: Math.max(width, 40),
          height: Math.max(height, 40),
        },
      ]}
    >
      <View
        style={[
          styles.carBody,
          {
            width,
            height,
            backgroundColor: crashed ? '#ef4444' : car.color,
            borderColor: stateColor,
          },
        ]}
      >
        <View
          style={[
            styles.carWindow,
            horizontal
              ? {
                  width: width * 0.34,
                  height: height * 0.62,
                  left: width * 0.33,
                  top: height * 0.19,
                }
              : {
                  width: width * 0.62,
                  height: height * 0.34,
                  left: width * 0.19,
                  top: height * 0.33,
                },
          ]}
        />
        {car.stopRequested && car.speedState !== 'stopped' ? (
          <View style={styles.stopRequestedDot} />
        ) : null}
      </View>
    </View>
  );
}

export default function App() {
  const [screenMode, setScreenMode] = useState('menu');
  const [boardSize, setBoardSize] = useState(0);
  const [cars, setCars] = useState([]);
  const [status, setStatus] = useState('ready');
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(0);
  const [lastAction, setLastAction] = useState(
    'Appuie sur Démarrer, puis touche une voiture pour l’arrêter où tu veux.'
  );
  const [crashedIds, setCrashedIds] = useState([]);

  const carsRef = useRef([]);
  const statusRef = useRef('ready');
  const elapsedRef = useRef(0);
  const passedRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const nextIdRef = useRef(1);

  const syncCars = useCallback((nextCars) => {
    carsRef.current = nextCars;
    setCars(nextCars);
  }, []);

  const startGame = useCallback(() => {
    carsRef.current = [];
    elapsedRef.current = 0;
    passedRef.current = 0;
    spawnTimerRef.current = 0;
    lastTickRef.current = Date.now();
    nextIdRef.current = 1;
    statusRef.current = 'running';

    setCars([]);
    setElapsed(0);
    setLevel(1);
    setScore(0);
    setPassed(0);
    setCrashedIds([]);
    setLastAction('Trafic lancé. Anticipe les files !');
    setStatus('running');
  }, []);

  const playGame = useCallback(() => {
    setScreenMode('game');
    startGame();
  }, [startGame]);

  const returnToMenu = useCallback(() => {
    statusRef.current = 'ready';
    setStatus('ready');
    setScreenMode('menu');
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      if (statusRef.current !== 'running' || boardSize <= 0) {
        lastTickRef.current = now;
        return;
      }

      const delta = Math.min((now - lastTickRef.current) / 1000, 0.033);
      lastTickRef.current = now;

      elapsedRef.current += delta;
      const currentLevel = 1 + Math.floor(elapsedRef.current / 45);
      const geometry = makeGeometry(boardSize);
      const baseSpeed =
        boardSize *
        (0.24 + Math.min(currentLevel - 1, 12) * 0.0055);

      let nextCars = carsRef.current.map((car) => {
        const nextCar = { ...car };
        const laneDelta = nextCar.lane - nextCar.lanePosition;

        if (Math.abs(laneDelta) > 0.001) {
          const laneStep = Math.min(Math.abs(laneDelta), delta * 7);
          nextCar.lanePosition += Math.sign(laneDelta) * laneStep;
        } else {
          nextCar.lanePosition = nextCar.lane;
        }

        if (nextCar.speedState === 'stopped') {
          return nextCar;
        }

        const sign = getAxisSign(nextCar.direction);
        const speed =
          baseSpeed * SPEED_MULTIPLIERS[nextCar.speedState];
        const movement = sign * speed * delta;

        nextCar.axis += movement;
        return nextCar;
      });

      let exitedCount = 0;
      nextCars = nextCars.filter((car) => {
        const limit = geometry.carLength * 1.4;
        const outside =
          car.axis < geometry.visibleMin - limit ||
          car.axis > geometry.visibleMax + limit;

        if (outside) exitedCount += 1;
        return !outside;
      });

      if (exitedCount > 0) {
        passedRef.current += exitedCount;
      }

      spawnTimerRef.current += delta;
      const spawnInterval = Math.max(
        0.78,
        1.68 - (currentLevel - 1) * 0.085
      );

      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current -= spawnInterval;
        const newCar = createCar(
          nextCars,
          geometry,
          currentLevel,
          nextIdRef.current
        );

        if (newCar) {
          nextIdRef.current += 1;
          nextCars.push(newCar);
        }
      }

      const collision = findCollision(nextCars, geometry);

      if (collision) {
        carsRef.current = nextCars;
        setCars(nextCars);
        setCrashedIds(collision);
        setLastAction('Collision ! La partie est terminée.');
        setStatus('gameover');
        statusRef.current = 'gameover';
      } else {
        syncCars(nextCars);
      }

      const currentScore =
        Math.floor(elapsedRef.current * 10) + passedRef.current * 25;

      setElapsed(elapsedRef.current);
      setLevel(currentLevel);
      setPassed(passedRef.current);
      setScore(currentScore);
    }, 16);

    return () => clearInterval(timer);
  }, [boardSize, syncCars]);

  const handleTap = useCallback(
    (carId) => {
      if (statusRef.current !== 'running') return;

      let action = '';

      const nextCars = carsRef.current.map((car) => {
        if (car.id !== carId) return car;

        if (car.speedState === 'stopped') {
          action = 'La voiture repart.';
          return {
            ...car,
            speedState: 'normal',
            stopRequested: false,
          };
        }

        action = 'Voiture arrêtée immédiatement.';
        return {
          ...car,
          speedState: 'stopped',
          stopRequested: false,
        };
      });

      if (action) setLastAction(action);
      syncCars(nextCars);
    },
    [syncCars]
  );

  const handleGesture = useCallback(
    (carId, dx, dy) => {
      if (statusRef.current !== 'running' || boardSize <= 0) return;

      const distance = Math.hypot(dx, dy);

      if (distance < 10) {
        handleTap(carId);
        return;
      }

      const geometry = makeGeometry(boardSize);
      const currentCar = carsRef.current.find((car) => car.id === carId);

      if (!currentCar) return;

      const vertical = isVertical(currentCar.direction);
      const sign = getAxisSign(currentCar.direction);
      const longitudinal = (vertical ? dy : dx) * sign;
      const lateral = vertical ? dx : dy;

      if (
        Math.abs(lateral) > Math.abs(longitudinal) * 0.7 &&
        Math.abs(lateral) > 12
      ) {
        const laneDelta = lateral > 0 ? 1 : -1;
        const targetLane = clamp(
          currentCar.lane + laneDelta,
          0,
          LANE_COUNT - 1
        );

        if (targetLane === currentCar.lane) {
          setLastAction('Déjà sur la voie extérieure.');
          return;
        }

        const nextCars = carsRef.current.map((car) =>
          car.id === carId ? { ...car, lane: targetLane } : car
        );

        setLastAction('Changement de voie, même dans le carrefour.');
        syncCars(nextCars);
        return;
      }

      if (Math.abs(longitudinal) > 14) {
        if (currentCar.speedState === 'stopped') {
          if (longitudinal > 0) {
            const nextCars = carsRef.current.map((car) =>
              car.id === carId
                ? {
                    ...car,
                    speedState: 'fast',
                    stopRequested: false,
                  }
                : car
            );

            setLastAction('La voiture repart en accéléré.');
            syncCars(nextCars);
          }
          return;
        }

        const nextSpeedState = longitudinal > 0 ? 'fast' : 'slow';
        const nextCars = carsRef.current.map((car) =>
          car.id === carId
            ? { ...car, speedState: nextSpeedState }
            : car
        );

        setLastAction(
          nextSpeedState === 'fast'
            ? 'Voiture accélérée.'
            : 'Voiture ralentie.'
        );
        syncCars(nextCars);
      }
    },
    [boardSize, handleTap, syncCars]
  );

  const levelProgress = (elapsed % 45) / 45;

  if (screenMode === 'menu') {
    return (
      <SafeAreaView style={styles.menuSafeArea}>
        <StatusBar style="dark" />
        <View style={styles.menuScreen}>
          <View style={styles.menuGlowOne} />
          <View style={styles.menuGlowTwo} />

          <View style={styles.menuTopBar}>
            <View>
              <Text style={styles.menuEyebrow}>TRAFFIC CONTROL</Text>
              <Text style={styles.menuBrand}>CARREFOUR</Text>
            </View>
            <View style={styles.menuVersion}>
              <Text style={styles.menuVersionText}>V0.8</Text>
            </View>
          </View>

          <View style={styles.menuHero}>
            <View style={styles.menuRoadPreview}>
              <View style={styles.menuRoadVertical} />
              <View style={styles.menuRoadHorizontal} />
              <View style={[styles.menuMiniCar, { left: '46%', top: '14%' }]} />
              <View style={[styles.menuMiniCarAlt, { left: '68%', top: '47%' }]} />
              <View style={[styles.menuMiniCarWarm, { left: '28%', top: '63%' }]} />
            </View>

            <Text style={styles.menuHeroTitle}>Maîtrise le trafic.</Text>
            <Text style={styles.menuHeroText}>
              Arrête, relance, accélère et change de voie pour éviter les collisions.
            </Text>
          </View>

          <View style={styles.menuButtons}>
            <Pressable
              onPress={playGame}
              style={({ pressed }) => [
                styles.menuPlayButton,
                pressed && styles.menuButtonPressed,
              ]}
            >
              <View>
                <Text style={styles.menuPlayKicker}>NIVEAU 1</Text>
                <Text style={styles.menuPlayText}>JOUER</Text>
              </View>
              <Text style={styles.menuPlayArrow}>›</Text>
            </Pressable>

            <View style={styles.menuSecondaryRow}>
              <Pressable style={styles.menuSecondaryButton}>
                <Text style={styles.menuSecondaryIcon}>⚙</Text>
                <Text style={styles.menuSecondaryTitle}>PARAMÈTRES</Text>
                <Text style={styles.menuSoon}>BIENTÔT</Text>
              </Pressable>

              <Pressable style={styles.menuSecondaryButton}>
                <Text style={styles.menuSecondaryIcon}>▥</Text>
                <Text style={styles.menuSecondaryTitle}>STATISTIQUES</Text>
                <Text style={styles.menuSoon}>BIENTÔT</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.menuFooter}>Prototype jouable · V0.8</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>NIVEAU EN COURS</Text>
            <Text style={styles.title}>CARREFOUR · V0.8</Text>
          </View>
          <Pressable onPress={returnToMenu} style={styles.menuChip}>
            <Text style={styles.menuChipText}>MENU</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>NIVEAU</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TEMPS</Text>
            <Text style={styles.statValue}>{Math.floor(elapsed)}s</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>PASSÉES</Text>
            <Text style={styles.statValue}>{passed}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: (levelProgress * 100).toFixed(1) + '%' },
            ]}
          />
        </View>

        <View
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width > 0 && Math.abs(width - boardSize) > 1) {
              setBoardSize(width);
            }
          }}
          style={styles.board}
        >
          <View pointerEvents="box-none" style={styles.sceneLayer}>
            {boardSize > 0 ? <RoadScene size={boardSize} /> : null}

            {boardSize > 0
              ? cars.map((car) => (
                  <Car
                    key={car.id}
                    car={car}
                    size={boardSize}
                    onGesture={handleGesture}
                    crashed={crashedIds.includes(car.id)}
                  />
                ))
              : null}
          </View>

          {status === 'gameover' ? (
            <View style={styles.overlay}>
              <View style={styles.overlayCard}>
                <Text style={styles.gameOverKicker}>COLLISION</Text>
                <Text style={styles.overlayTitle}>Partie terminée</Text>
                <Text style={styles.overlayScore}>{score} pts</Text>
                <Text style={styles.overlayText}>
                  Niveau {level} · {Math.floor(elapsed)} secondes · {passed}{' '}
                  voitures sorties
                </Text>
                <Pressable
                  onPress={startGame}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>REJOUER</Text>
                </Pressable>
                <Pressable onPress={returnToMenu} style={styles.backMenuButton}>
                  <Text style={styles.backMenuButtonText}>RETOUR AU MENU</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.actionBar}>
          <View style={styles.actionDot} />
          <Text style={styles.actionText} numberOfLines={2}>
            {lastAction}
          </Text>
        </View>

        <View style={styles.quickControls}>
          <Text style={styles.quickControlText}>APPUI · arrêt / normal</Text>
          <Text style={styles.quickControlText}>SWIPE AVANT · rapide</Text>
          <Text style={styles.quickControlText}>SWIPE CÔTÉ · voie</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4fbfc',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#f4fbfc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eyebrow: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: '#16343f',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  versionBadge: {
    minWidth: 44,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f7fbfc',
    borderWidth: 1,
    borderColor: '#b6d3db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionBadgeText: {
    color: '#0284c7',
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: '#f8fcfd',
    borderWidth: 1,
    borderColor: '#bfd8df',
  },
  statLabel: {
    color: '#607b84',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    color: '#16343f',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: '#c8dfe5',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#38bdf8',
  },
  progressCaption: {
    color: '#5e7881',
    fontSize: 10,
    marginTop: 5,
    marginBottom: 9,
    textAlign: 'right',
  },
  board: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#d8efb7',
    borderWidth: 1,
    borderColor: '#c9e2dc',
  },
  sceneLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  grass: {
    backgroundColor: '#d5efb1',
  },
  cornerPatch: {
    position: 'absolute',
    backgroundColor: 'rgba(234, 247, 214, 0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  road: {
    position: 'absolute',
    backgroundColor: '#77838d',
  },
  intersection: {
    position: 'absolute',
    backgroundColor: '#828e98',
  },
  laneLine: {
    position: 'absolute',
    opacity: 0.95,
  },
  stopLine: {
    position: 'absolute',
    backgroundColor: '#f8fafc',
    opacity: 0.9,
  },
  roadWord: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  yieldWord: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  carTouch: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  carBody: {
    borderRadius: 6,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  carWindow: {
    position: 'absolute',
    borderRadius: 3,
    backgroundColor: 'rgba(8,19,26,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  stopRequestedDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 99,
    right: 2,
    top: 2,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(29,62,70,0.36)',
  },
  overlayCard: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 18,
    padding: 20,
    backgroundColor: '#f7fbfc',
    borderWidth: 1,
    borderColor: '#b7d5dc',
  },
  overlayKicker: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  gameOverKicker: {
    color: '#fb7185',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  overlayTitle: {
    color: '#16343f',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 5,
  },
  overlayScore: {
    color: '#0284c7',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
  },
  overlayText: {
    color: '#49636d',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 18,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    color: '#041018',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  actionBar: {
    minHeight: 42,
    marginTop: 9,
    borderRadius: 12,
    backgroundColor: '#f4fafb',
    borderWidth: 1,
    borderColor: '#b9d6dd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 9,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#38bdf8',
  },
  actionText: {
    flex: 1,
    color: '#38525c',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsCard: {
    marginTop: 9,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f7fbfc',
    borderWidth: 1,
    borderColor: '#bdd8de',
  },
  controlsTitle: {
    color: '#5f7982',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
    gap: 8,
  },
  controlGesture: {
    width: 78,
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '900',
  },
  controlDescription: {
    flex: 1,
    color: '#49636d',
    fontSize: 11,
    lineHeight: 15,
  },
  stateLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#d4e5e9',
  },
  stateLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stateDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  stateLegendText: {
    color: '#58727c',
    fontSize: 9,
    fontWeight: '800',
  },
  menuSafeArea: {
    flex: 1,
    backgroundColor: '#eef9fb',
  },
  menuScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: '#eef9fb',
    overflow: 'hidden',
  },
  menuGlowOne: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    right: -90,
    top: -70,
    backgroundColor: 'rgba(56,189,248,0.13)',
  },
  menuGlowTwo: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 999,
    left: -100,
    bottom: 60,
    backgroundColor: 'rgba(52,211,153,0.12)',
  },
  menuTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  menuEyebrow: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  menuBrand: {
    color: '#12333e',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  menuVersion: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cfe5ea',
  },
  menuVersionText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '900',
  },
  menuHero: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 2,
  },
  menuRoadPreview: {
    alignSelf: 'center',
    width: 210,
    height: 210,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#bce79e',
    borderWidth: 1,
    borderColor: '#cfe6df',
    marginBottom: 24,
    shadowColor: '#315866',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  menuRoadVertical: {
    position: 'absolute',
    width: 72,
    height: '100%',
    left: 69,
    backgroundColor: '#929da6',
  },
  menuRoadHorizontal: {
    position: 'absolute',
    height: 72,
    width: '100%',
    top: 69,
    backgroundColor: '#929da6',
  },
  menuMiniCar: {
    position: 'absolute',
    width: 14,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#0ea5e9',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  menuMiniCarAlt: {
    position: 'absolute',
    width: 28,
    height: 14,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  menuMiniCarWarm: {
    position: 'absolute',
    width: 28,
    height: 14,
    borderRadius: 5,
    backgroundColor: '#f97316',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  menuHeroTitle: {
    color: '#16343f',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  menuHeroText: {
    color: '#5c737d',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 22,
  },
  menuButtons: {
    zIndex: 2,
  },
  menuPlayButton: {
    minHeight: 84,
    borderRadius: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0ea5e9',
    shadowColor: '#0369a1',
    shadowOpacity: 0.20,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  menuButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  menuPlayKicker: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  menuPlayText: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 2,
  },
  menuPlayArrow: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '300',
    marginTop: -4,
  },
  menuSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  menuSecondaryButton: {
    flex: 1,
    minHeight: 90,
    borderRadius: 18,
    padding: 13,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: '#d5e8ec',
  },
  menuSecondaryIcon: {
    color: '#0ea5e9',
    fontSize: 20,
    fontWeight: '900',
  },
  menuSecondaryTitle: {
    color: '#284954',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
  },
  menuSoon: {
    color: '#8ca1a9',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0.8,
  },
  menuFooter: {
    color: '#90a5ad',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
    zIndex: 2,
  },
  menuChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c9dfe4',
  },
  menuChipText: {
    color: '#377080',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  backMenuButton: {
    minHeight: 42,
    marginTop: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf4f6',
  },
  backMenuButtonText: {
    color: '#41626d',
    fontSize: 11,
    fontWeight: '900',
  },
  quickControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickControlText: {
    color: '#55727c',
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#d3e5e9',
  }
});
