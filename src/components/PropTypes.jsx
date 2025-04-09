import PropTypes from 'prop-types';

const PropTypesComponent = () => {
  return null;
};

PropTypesComponent.propTypes = {
  savedBuilds: PropTypes.arrayOf(
    PropTypes.shape({
      vehicleModel: PropTypes.string.isRequired,
      modifications: PropTypes.string,
      horsepower: PropTypes.number.isRequired,
      price: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default PropTypesComponent;