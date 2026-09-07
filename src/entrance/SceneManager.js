export class SceneManager {
  constructor({ entrance, training }) {
    this.entrance = entrance;
    this.training = training;
    this.currentScene = null;
  }

  showEntrance() {
    this.entrance.visible = true;
    this.training.visible = false;
    this.currentScene = 'entrance';
  }

  showTraining() {
    this.entrance.visible = false;
    this.training.visible = true;
    this.currentScene = 'training';
  }
}
