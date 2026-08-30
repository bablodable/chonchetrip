(() => {
  'use strict';

  if (typeof L === 'undefined' || typeof map === 'undefined' || !Array.isArray(points) || !Array.isArray(segments)) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('embed') === '1') document.documentElement.classList.add('live-map-embedded');

  function readArrayParam(name) {
    try {
      const value = JSON.parse(params.get(name) ?? '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  const pointByNumber = new Map(points.map((point) => [point.n, point]));
  const routeEntries = [];
  const routeLegs = [];

  segments.forEach((segment) => {
    segment.path.forEach((pointNumber, index) => {
      if (!pointByNumber.has(pointNumber)) return;
      if (index === 0 && routeEntries.at(-1)?.pointNumber === pointNumber) return;

      const previous = routeEntries.at(-1);
      if (previous) routeLegs.push({ from: previous.pointNumber, to: pointNumber, type: segment.type });
      routeEntries.push({ pointNumber });
    });
  });

  const clampProgress = (value) => Math.max(0, Math.min(routeEntries.length, Number.isFinite(value) ? Math.round(value) : 0));
  let minimumSteps = clampProgress(Number(params.get('minimum') ?? 0));
  let completedSceneIds = new Set(readArrayParam('completed').filter((value) => typeof value === 'string'));
  let routeScenes = readArrayParam('routeScenes');
  let userPosition = null;
  let userAccuracy = null;
  let locationMarker = null;
  let accuracyCircle = null;
  let userToTargetLine = null;
  let watchId = null;
  let locationButton = null;

  map.eachLayer((layer) => {
    if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) map.removeLayer(layer);
  });

  const routeLayer = L.layerGroup().addTo(map);

  const locationControl = L.control({ position: 'bottomright' });
  locationControl.onAdd = () => {
    const button = L.DomUtil.create('button', 'live-location-button');
    button.type = 'button';
    button.textContent = '📍';
    button.title = 'Показать моё точное местоположение';
    button.setAttribute('aria-label', 'Показать моё точное местоположение');
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button, 'click', () => {
      if (userPosition) map.setView(userPosition, Math.max(map.getZoom(), 16));
      else startLocationWatch(true);
    });
    locationButton = button;
    return button;
  };
  locationControl.addTo(map);

  function sceneGroup(index) {
    const group = routeScenes[index];
    return Array.isArray(group) ? group.filter((value) => typeof value === 'string') : [];
  }

  function entryComplete(index) {
    if (index < minimumSteps) return true;
    const group = sceneGroup(index);
    return group.length > 0 && group.every((sceneId) => completedSceneIds.has(sceneId));
  }

  function activeSceneId() {
    for (let index = minimumSteps; index < routeEntries.length; index += 1) {
      const pendingScene = sceneGroup(index).find((sceneId) => !completedSceneIds.has(sceneId));
      if (pendingScene) return pendingScene;
    }
    return null;
  }

  function targetRouteIndex() {
    const sceneId = activeSceneId();
    if (!sceneId) return -1;
    let targetIndex = -1;
    routeEntries.forEach((_, index) => {
      if (sceneGroup(index).includes(sceneId)) targetIndex = index;
    });
    return targetIndex;
  }

  function targetPoint() {
    const index = targetRouteIndex();
    return index >= 0 ? pointByNumber.get(routeEntries[index].pointNumber) : null;
  }

  function occurrenceIndexes(pointNumber) {
    const indexes = [];
    routeEntries.forEach((entry, index) => {
      if (entry.pointNumber === pointNumber) indexes.push(index);
    });
    return indexes;
  }

  function pointStatus(pointNumber) {
    if (targetPoint()?.n === pointNumber) return 'next';
    const occurrences = occurrenceIndexes(pointNumber);
    return occurrences.length > 0 && occurrences.every(entryComplete) ? 'passed' : 'future';
  }

  function liveMarkerIcon(point, status) {
    const statusClass = status === 'passed' ? 'live-passed' : status === 'next' ? 'live-next' : 'live-future';
    const badge = status === 'passed' ? '✓' : point.n;
    const size = status === 'next' ? 44 : 38;
    return L.divIcon({
      className: '',
      html: `<div class="route-marker live-map-marker ${statusClass}" title="${point.n}. ${point.name}"><span>${point.emoji}</span><span class="live-marker-badge">${badge}</span></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function renderMarkers() {
    points.forEach((point) => {
      const status = pointStatus(point.n);
      const marker = markerMap[point.n];
      if (!marker) return;
      marker.setIcon(liveMarkerIcon(point, status));
      marker.unbindTooltip();
      if (status === 'next') {
        marker.bindTooltip(`Цель текущей сцены · ${point.n}`, {
          permanent: true,
          direction: 'top',
          className: 'live-next-tooltip',
          offset: [0, -19],
        });
      }
    });

    document.querySelectorAll('#stops .stop').forEach((stop, index) => {
      const point = points[index];
      if (!point) return;
      const status = pointStatus(point.n);
      stop.classList.toggle('live-passed', status === 'passed');
      stop.classList.toggle('live-next', status === 'next');
    });
  }

  function renderRoutes() {
    routeLayer.clearLayers();
    const currentScene = activeSceneId();

    routeLegs.forEach((leg, index) => {
      const destinationIndex = index + 1;
      if (entryComplete(destinationIndex)) return;

      const from = pointByNumber.get(leg.from);
      const to = pointByNumber.get(leg.to);
      if (!from || !to) return;

      const isCurrent = Boolean(currentScene && sceneGroup(destinationIndex).includes(currentScene));
      L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
        color: isCurrent ? '#e89424' : leg.type === 'rail' ? '#6f7fba' : '#bb877e',
        weight: isCurrent ? 7 : leg.type === 'rail' ? 3.5 : 4,
        opacity: isCurrent ? 0.96 : 0.34,
        dashArray: isCurrent ? '13 9' : leg.type === 'rail' ? '8 11' : null,
        className: isCurrent ? 'live-route-current' : 'live-route-future',
      }).addTo(routeLayer);
    });
  }

  function distanceInMeters(from, to) {
    const earthRadius = 6371000;
    const radians = (degrees) => degrees * Math.PI / 180;
    const deltaLat = radians(to.lat - from.lat);
    const deltaLng = radians(to.lng - from.lng);
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(meters) {
    return meters < 1000 ? `${Math.round(meters)} м` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} км`;
  }

  function updateLocationButton(message, ready = false) {
    if (!locationButton) return;
    locationButton.title = message;
    locationButton.setAttribute('aria-label', message);
    locationButton.classList.toggle('is-ready', ready);
  }

  function renderUserRoute() {
    if (userToTargetLine) {
      map.removeLayer(userToTargetLine);
      userToTargetLine = null;
    }

    const target = targetPoint();
    if (!userPosition) return;

    if (target) {
      userToTargetLine = L.polyline([userPosition, [target.lat, target.lng]], {
        color: '#1978d4',
        weight: 4,
        opacity: 0.86,
        dashArray: '5 9',
        className: 'live-user-route',
      }).addTo(map);
      const meters = distanceInMeters({ lat: userPosition[0], lng: userPosition[1] }, target);
      updateLocationButton(`Вы здесь · GPS ±${Math.round(userAccuracy ?? 0)} м · до цели ${formatDistance(meters)} по прямой`, true);
    } else {
      updateLocationButton(`Вы здесь · GPS ±${Math.round(userAccuracy ?? 0)} м`, true);
    }
  }

  function renderProgress() {
    renderMarkers();
    renderRoutes();
    renderUserRoute();
  }

  function updateLocation(position, focus) {
    userPosition = [position.coords.latitude, position.coords.longitude];
    userAccuracy = position.coords.accuracy;

    if (!locationMarker) {
      const icon = L.divIcon({
        className: '',
        html: '<div class="live-location-dot" title="Вы здесь"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      locationMarker = L.marker(userPosition, { icon, zIndexOffset: 2000 }).addTo(map).bindTooltip('Вы здесь');
      accuracyCircle = L.circle(userPosition, {
        radius: userAccuracy,
        color: '#1978d4',
        weight: 1,
        fillColor: '#4ba3f2',
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      locationMarker.setLatLng(userPosition);
      accuracyCircle.setLatLng(userPosition).setRadius(userAccuracy);
    }

    locationButton?.classList.remove('is-waiting');
    renderUserRoute();

    const target = targetPoint();
    const nearRoute = target && distanceInMeters({ lat: userPosition[0], lng: userPosition[1] }, target) < 50000;
    if (focus || nearRoute) {
      if (target && nearRoute) map.fitBounds([userPosition, [target.lat, target.lng]], { padding: [56, 56], maxZoom: 16 });
      else map.setView(userPosition, 16);
    }
  }

  function handleLocationError(error) {
    const messages = {
      1: 'Разреши геолокацию; на телефоне локальный HTTP её блокирует',
      2: 'Телефон пока не смог определить позицию',
      3: 'GPS отвечает слишком долго — нажми ещё раз',
    };
    locationButton?.classList.remove('is-waiting');
    updateLocationButton(messages[error.code] ?? 'Геолокация временно недоступна');
  }

  function startLocationWatch(focus = false) {
    if (!navigator.geolocation) {
      updateLocationButton(window.isSecureContext ? 'Этот браузер не поддерживает геолокацию' : 'GPS заработает на защищённом HTTPS-адресе');
      if (locationButton) locationButton.disabled = true;
      return;
    }

    locationButton?.classList.add('is-waiting');
    if (watchId !== null) {
      if (focus && userPosition) map.setView(userPosition, 16);
      return;
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => updateLocation(position, focus),
      handleLocationError,
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== 'chonchetrip-map-progress') return;
    minimumSteps = clampProgress(Number(event.data.minimumSteps ?? minimumSteps));
    completedSceneIds = new Set(Array.isArray(event.data.completedSceneIds) ? event.data.completedSceneIds : []);
    routeScenes = Array.isArray(event.data.routeScenes) ? event.data.routeScenes : [];
    renderProgress();
  });

  window.addEventListener('beforeunload', () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  });

  renderProgress();
  setTimeout(() => {
    map.invalidateSize();
    startLocationWatch(false);
  }, 350);
})();
