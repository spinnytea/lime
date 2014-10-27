'use strict';
// all numbers are a range of possible values

var typeName = 'lime_number';

// value:
//   bl, br: is the number bounded left or right? true = '[', false = '('
//   l, r: the min/max of the value
// unit: idea.id
function isNumber(obj) {
  if(typeof obj !== 'object')
    return false;

  if(obj.type)
    return obj.type === typeName;

  if(!(typeof obj.unit === 'string' &&
    typeof obj.value === 'object' &&
    typeof obj.value.bl === 'boolean' &&
    typeof obj.value.l === 'number' &&
    typeof obj.value.r === 'number' &&
    typeof obj.value.br === 'boolean' &&
    obj.value.l <= obj.value.r
  ))
    return false;

  obj.type = typeName;
  return true;
}

exports.combine = function(n1, n2) {
  if(!isNumber(n1) || !isNumber(n2))
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
