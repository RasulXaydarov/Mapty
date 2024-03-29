'use-strict';
////////////////////////////////////////////
// Workout DATA, running and cycling classes
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.type = 'cycling';
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);
///////////////////////////////////////
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let edit;

////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  edit = document.querySelector('.edit');
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
  }

  /////////////////////////////////////
  // Geolocation API
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get you position');
        }
      );
  }
  ///////////////////////////////////////////
  // Displaying a map using leaflet library
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    //   console.log(map);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //////////////////////////////////////////
    //  Displaying a map marker
    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  //////////////////////////////////////
  // rendering workout input

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs

    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  //////////////////////////////////////////
  // Creating new workout

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    console.log(e.target);
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let lat, lng;
    //  Position latitude and longitude for new workout
    if (this.#mapEvent.latlng !== undefined) lat = this.#mapEvent.latlng.lat;
    if (this.#mapEvent.latlng !== undefined) lng = this.#mapEvent.latlng.lng;
    // Position latitude and longitude for editing saved workout
    if (this.#mapEvent.latlng === undefined) lat = this.#mapEvent.coords?.[0];
    if (this.#mapEvent.latlng === undefined) lng = this.#mapEvent.coords?.[1];
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to the workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    //////////////////////////////////////////////
    // Render workout
    // Render workout on list
    this._renderWorkout(workout);

    // Hide + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
   
    
    <h2 class="workout__title">${
      workout.description
    }<div class="edit" data-id="${workout.id}">🖍</div>  </h2>
    <div class="workout__details">
    <span class="workout__icon">${
      workout.type === 'running' ? '🏃' : '🚴‍♀️'
    }</span>
    <span class="workout__value">${workout.distance}</span>
    <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${workout.duration}</span>
    <span class="workout__unit">min</span>
    </div>
   
      
  `;

    if (workout.type === 'running')
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
       <span class="workout__icon">🦶🏼</span>
       <span class="workout__value">${workout.cadence}</span>
     <span class="workout__unit">spm</span>
    </div>
      
    <p><button class="del">Delete</button></p>
 </li>
 `;
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.speed.toFixed(1)}</span>
         <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
         <span class="workout__icon">⛰</span>
         <span class="workout__value">${workout.elevationGain}</span>
         <span class="workout__unit">m</span>
          </div>
          <p><button class="del">Delete</button></p>
        </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  _editWorkout(e) {
    const editEl = e.target.closest('.edit');

    if (!editEl) return;

    // delete previously saved workout

    const workout = this.#workouts.find(work => work.id === editEl.dataset.id);
    const editFormData = this._showForm();

    const { distance, duration } = workout;
    if (workout.type === 'cycling') this._toggleElevationField();
    const { elevationGain } = workout;
    inputDistance.value = +distance;
    inputDuration.value = +duration;
    inputElevation.value = +elevationGain;
    console.dir(inputType);
    console.log(workout);
    this.#mapEvent = workout;

    if (workout.type === 'running') {
      const { cadence } = workout;
      inputDistance.value = +distance;
      inputDuration.value = +duration;
      inputCadence.value = +cadence;
      this.#mapEvent = workout;
    }
  }

  _deleteWorkout(e) {
    // 1) delete clicked wourkout
    // 2) add event to the button to delete workout
    // add delete button to the saved workout
    // get local storage data
    // delete data for chosen workout
    // add  button delete workout
    // delete html element
    const workoutEl = e.target.closest('.workout');

    console.log(this.#workouts);
    // indexOf searchs index from the beginning of the array SearchElement argument is element is looking for in array

    // delete this.#workouts[
    //   data.indexOf(data.find(workoutE => workoutE.id === workoutEl.dataset.id))
    // ];

    let index = this.#workouts.findIndex(
      workoutE => workoutE.id === workoutEl.dataset.id
    );

    this.#workouts.splice(index, 1);
  }

  // Close the dropdown menu if the user clicks outsideof it
  /////////////////////////////////////////////////
  //Move to marker on click
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }
  //////////////////////////////////////////////
  //Local storage
  _setLocalStorage() {
    console.log(this.#workouts);
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;
    this.#workouts.splice(14, 3);
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// <div class="edit-dropdown"><button onclick="myFunction()" class="dropbtn">⁝</button>
// <div id="myDropdown" class="dropdown-content">
// <a href="#">Edit</a>
// <a href="#">Delete workout</a>
// <a href="#">Delete all workouts</a>
// </div></div>

// function myFunction() {
//   document.getElementById('myDropdown').classList.toggle('show');
// }
