document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const audioPlayer = document.getElementById("audio-player");
  const playBtn = document.getElementById("play-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const progress = document.getElementById("progress");
  const progressBar = document.querySelector(".progress-bar");
  const currentTimeEl = document.getElementById("current-time");
  const durationEl = document.getElementById("duration");
  const volumeSlider = document.querySelector(".volume-slider");
  const volumeProgress = document.getElementById("volume-progress");
  const albumArt = document.querySelector(".album-art");
  const albumCover = document.getElementById("album-cover");
  const trackTitle = document.getElementById("track-title");
  const artistName = document.getElementById("artist-name");
  const playlist = document.getElementById("playlist");
  const backgroundEl = document.querySelector(".background");

  // Initial state
  let isPlaying = false;
  let currentTrackIndex = 0;
  let tracks = [];

  // Volume slider state
  let isDraggingVolume = false;

  // Track metadata cache
  const metadataCache = new Map();

  // Load tracks from JSON file
  async function loadTrackData() {
    try {
      const response = await fetch("tracks.json");
      if (!response.ok) {
        throw new Error("Failed to load tracks");
      }

      tracks = await response.json();

      initPlayer();

      preloadAllTrackMetadata();
    } catch (error) {
      console.error("Error loading tracks:", error);
      showError("Failed to load track data. Please try again later.");
    }
  }

  // Preload metadata for all tracks
  function preloadAllTrackMetadata() {
    tracks.forEach((track, index) => {
      const tempAudio = new Audio();

      tempAudio.preload = "metadata";

      tempAudio.addEventListener("loadedmetadata", function () {
        metadataCache.set(index, tempAudio.duration);

        updateTrackDuration(index, tempAudio.duration);

        tempAudio.src = "";
      });

      tempAudio.src = track.src;
    });
  }

  // Update a specific track's duration display
  function updateTrackDuration(index, duration) {
    const durationFormatted = formatTime(duration);
    const trackDurationEl = document.querySelector(
      `.playlist-item[data-index="${index}"] .track-duration`
    );
    if (trackDurationEl) {
      trackDurationEl.textContent = durationFormatted;
    }
  }

  // Show error message
  function showError(message) {
    const errorEl = document.createElement("div");
    errorEl.className = "error-message";
    errorEl.textContent = message;
    document.querySelector(".player-container").prepend(errorEl);
  }

  // Initialize player
  function initPlayer() {
    if (tracks.length === 0) {
      showError("No tracks available");
      return;
    }

    generatePlaylist();

    loadTrack(currentTrackIndex);

    audioPlayer.volume = 0.7;
    volumeProgress.style.width = "70%";

    setupAudioEvents();
  }

  // Generate playlist HTML
  function generatePlaylist() {
    playlist.innerHTML = "";

    tracks.forEach((track, index) => {
      const li = document.createElement("li");
      li.className = "playlist-item";
      li.dataset.index = index;

      const cachedDuration = metadataCache.get(index);
      const durationText = cachedDuration
        ? formatTime(cachedDuration)
        : "--:--";

      li.innerHTML = `
                <div class="track-info">
                    <span class="track-name">${track.title}</span>
                    <span class="artist-name">${track.artist}</span>
                </div>
                <span class="track-duration">${durationText}</span>
            `;

      li.addEventListener("click", () => {
        if (currentTrackIndex === index && isPlaying) {
          togglePlay();
        } else {
          if (isPlaying) {
            audioPlayer.pause();
            playBtn.classList.remove("playing");
            albumArt.classList.remove("playing");
            isPlaying = false;
          }

          currentTrackIndex = index;
          loadTrack(currentTrackIndex);

          setTimeout(() => {
            togglePlay();
          }, 50);
        }
      });

      playlist.appendChild(li);
    });
  }

  // Setup audio event listeners
  function setupAudioEvents() {
    audioPlayer.addEventListener("loadedmetadata", function () {
      const duration = formatTime(audioPlayer.duration);
      durationEl.textContent = duration;

      metadataCache.set(currentTrackIndex, audioPlayer.duration);

      const activeDuration = document.querySelector(
        `.playlist-item[data-index="${currentTrackIndex}"] .track-duration`
      );
      if (activeDuration) {
        activeDuration.textContent = duration;
      }
    });

    audioPlayer.addEventListener("timeupdate", function () {
      if (!isNaN(audioPlayer.duration)) {
        const progressPercent =
          (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = `${progressPercent}%`;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
      }
    });

    audioPlayer.addEventListener("ended", nextTrack);

    audioPlayer.addEventListener("error", function () {
      console.error("Error loading audio");
      showMessage("Error playing this track. Skipping to next...");
      setTimeout(nextTrack, 2000);
    });
  }

  // Format time from seconds to MM:SS
  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" + secs : secs}`;
  }

  // Load track function
  function loadTrack(index) {
    const track = tracks[index];

    trackTitle.textContent = track.title;
    artistName.textContent = track.artist;
    albumCover.src = track.cover || "default-cover.jpg";

    audioPlayer.src = track.src;
    audioPlayer.load();

    updateColors(index);

    updatePlaylistActiveItem(index);

    progress.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "--:--";
  }

  // Update colors based on track index (for variety)
  function updateColors(index) {
    const colorSets = [
      [113, 89, 193], // Purple
      [45, 149, 150], // Teal
      [244, 162, 97], // Orange
      [239, 71, 111], // Red
      [85, 107, 47], // Olive
    ];

    const colorIndex = index % colorSets.length;
    const [r, g, b] = colorSets[colorIndex];

    const primaryColor = `rgba(${r}, ${g}, ${b}, 1)`;
    const secondaryColor = `rgba(${r * 0.8}, ${g * 0.8}, ${b * 0.8}, 1)`;

    document.documentElement.style.setProperty("--primary-color", primaryColor);
    document.documentElement.style.setProperty(
      "--secondary-color",
      secondaryColor
    );

    backgroundEl.style.background = `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`;
  }

  // Update active playlist item
  function updatePlaylistActiveItem(index) {
    document.querySelectorAll(".playlist-item").forEach((item) => {
      item.classList.remove("active");
    });

    const activeItem = document.querySelector(
      `.playlist-item[data-index="${index}"]`
    );
    if (activeItem) {
      activeItem.classList.add("active");
    }
  }

  // Play/Pause function
  function togglePlay() {
    if (isPlaying) {
      audioPlayer.pause();
      playBtn.classList.remove("playing");
      albumArt.classList.remove("playing");
    } else {
      const playPromise = audioPlayer.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            playBtn.classList.add("playing");
            albumArt.classList.add("playing");
          })
          .catch((error) => {
            console.error("Playback was prevented:", error);
            showMessage("Click to start playback");
            isPlaying = false;
            return;
          });
      }
    }

    isPlaying = !isPlaying;
  }

  // Next track function
  function nextTrack() {
    const wasPlaying = isPlaying;

    if (isPlaying) {
      audioPlayer.pause();
      playBtn.classList.remove("playing");
      albumArt.classList.remove("playing");
      isPlaying = false;
    }

    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);

    if (wasPlaying) {
      setTimeout(() => {
        togglePlay();
      }, 100);
    }
  }

  // Previous track function
  function prevTrack() {
    // Save playing state
    const wasPlaying = isPlaying;

    if (isPlaying) {
      audioPlayer.pause();
      playBtn.classList.remove("playing");
      albumArt.classList.remove("playing");
      isPlaying = false;
    }

    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrackIndex);

    if (wasPlaying) {
      setTimeout(() => {
        togglePlay();
      }, 100);
    }
  }

  // Handle seeking on progress bar click
  function seek(e) {
    if (!audioPlayer.duration) return;

    const progressBarRect = progressBar.getBoundingClientRect();
    const seekPosition =
      (e.clientX - progressBarRect.left) / progressBarRect.width;

    const clampedPosition = Math.max(0, Math.min(seekPosition, 1));

    audioPlayer.currentTime = clampedPosition * audioPlayer.duration;

    progress.style.width = `${clampedPosition * 100}%`;
  }

  // Volume control functions
  function updateVolume(e) {
    const volumeBarRect = volumeSlider.getBoundingClientRect();
    let volumePosition;

    if (e.touches) {
      volumePosition =
        (e.touches[0].clientX - volumeBarRect.left) / volumeBarRect.width;
    } else {
      volumePosition = (e.clientX - volumeBarRect.left) / volumeBarRect.width;
    }

    const volume = Math.min(Math.max(volumePosition, 0), 1);

    volumeProgress.style.width = `${volume * 100}%`;

    audioPlayer.volume = volume;
  }

  // Start volume drag
  function startVolumeDrag(e) {
    isDraggingVolume = true;
    updateVolume(e);

    document.addEventListener("mousemove", updateVolume);
    document.addEventListener("touchmove", updateVolume);

    document.addEventListener("mouseup", stopVolumeDrag);
    document.addEventListener("touchend", stopVolumeDrag);
  }

  // Stop volume drag
  function stopVolumeDrag() {
    if (isDraggingVolume) {
      isDraggingVolume = false;

      document.removeEventListener("mousemove", updateVolume);
      document.removeEventListener("touchmove", updateVolume);
    }
  }

  // Show message
  function showMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "message";
    messageElement.textContent = message;
    messageElement.style.position = "absolute";
    messageElement.style.top = "10px";
    messageElement.style.left = "50%";
    messageElement.style.transform = "translateX(-50%)";
    messageElement.style.padding = "10px 20px";
    messageElement.style.background = "rgba(0, 0, 0, 0.7)";
    messageElement.style.borderRadius = "8px";
    messageElement.style.color = "white";
    messageElement.style.zIndex = "100";

    document.body.appendChild(messageElement);

    setTimeout(() => {
      messageElement.style.opacity = "0";
      messageElement.style.transition = "opacity 0.5s ease";

      setTimeout(() => {
        messageElement.remove();
      }, 500);
    }, 3000);
  }

  // Event listeners for track control
  playBtn.addEventListener("click", togglePlay);
  nextBtn.addEventListener("click", nextTrack);
  prevBtn.addEventListener("click", prevTrack);
  progressBar.addEventListener("click", seek);

  volumeSlider.addEventListener("click", function (e) {
    if (!isDraggingVolume) {
      updateVolume(e);
    }
  });
  volumeSlider.addEventListener("mousedown", startVolumeDrag);
  volumeSlider.addEventListener("touchstart", startVolumeDrag);

  volumeSlider.style.cursor = "pointer";

  volumeSlider.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  loadTrackData();
});
