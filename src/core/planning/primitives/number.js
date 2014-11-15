'use strict';
// this represents how much there is of something
// e.g. '13.5 meters' or '22.3124 psi'
// all numbers are a range of possible values

var typeName = 'lime_number';

// value:
//   bl, br: is the number bounded left or right? true = '[', false = '('
//   l, r: the min/max of the value
// unit: idea.id
exports.isNumber = function(obj) {
  if(typeof obj !== 'object')
    return false;

  if(!(typeof obj.unit === 'string' &&
    typeof obj.value === 'object' &&
    typeof obj.value.bl === 'boolean' &&
    (typeof obj.value.l === 'number' || obj.value.l === null) &&
    (typeof obj.value.r === 'number' || obj.value.r === null) &&
    typeof obj.value.br === 'boolean' &&
    (!obj.type || obj.type === typeName) &&
    (obj.value.l <= obj.value.r || obj.value.l === null || obj.value.r === null)
  ))
    return false;

  // TODO combine this with above
  if(obj.value.l === null || obj.value.l === -Infinity) {
    if(obj.value.bl === true)
      return false;
  }
  if(obj.value.r === null || obj.value.r === Infinity) {
    if(obj.value.br === true)
      return false;
  }

  if(obj.value.l === null)
    obj.value.l = -Infinity;
  if(obj.value.r === null)
    obj.value.r = Infinity;

  obj.type = typeName;
  return true;
};

// construct a value object (for ease)
// (see the spec for examples)
exports.value = function() {
  var l = arguments[0];
  var r, bl, br;
  if(typeof arguments[1] === 'number') {
    r = arguments[1];
    bl = typeof arguments[2] === 'boolean' ? arguments[2] : true;
    br = typeof arguments[3] === 'boolean' ? arguments[3] : bl;
  } else {
    r = arguments[0];
    bl = typeof arguments[1] === 'boolean' ? arguments[1] : true;
    br = typeof arguments[2] === 'boolean' ? arguments[2] : bl;
  }

  if(l === -Infinity) bl = false;
  if(r === Infinity) br = false;

  return { bl: bl, l: l, r: r, br: br };
};

// add these two values
// n1 + n2
exports.combine = function(n1, n2) {
  if(!exports.isNumber(n1) || !exports.isNumber(n2))
    return undefined;
  if(n1.unit !== n2.unit)
    return undefined;

  return {
    type: typeName,
    value: {
      bl: (n1.value.bl && n2.value.bl),
      l: (n1.value.l + n2.value.l),
      r: (n1.value.r + n2.value.r),
      br: (n1.value.br && n2.value.br),
    },
    unit: n1.unit,
  };
};

// subtract these two values
// n1 - n2
exports.remove = function(n1, n2) {
  if(!exports.isNumber(n1) || !exports.isNumber(n2))
    return undefined;
  if(n1.unit !== n2.unit)
    return undefined;

  return {
    type: typeName,
    value: {
      bl: (n1.value.bl && n2.value.bl),
      l: (n1.value.l - n2.value.l),
      r: (n1.value.r - n2.value.r),
      br: (n1.value.br && n2.value.br),
    },
    unit: n1.unit,
  };
};

// abs(n1 - n2)
exports.difference = function(n1, n2) {
  if(!exports.isNumber(n1) || !exports.isNumber(n2))
    return undefined;
  if(n1.unit !== n2.unit)
    return undefined;

  // if n2 is entirely larger than n1
  if(n1.value.r < n2.value.l)
    return n2.value.l - n1.value.r;

  // if n1 is entirely larger than n2
  if(n2.value.r < n1.value.l)
    return n1.value.l - n2.value.r;

  // the effective difference is zero
  return 0;
};