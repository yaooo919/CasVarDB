import Levenshtein from 'fast-levenshtein';

// 计算最小编辑距离
function minEditDistance(spacer, target) {
  let spacer_len = spacer.length;
  let min_distance = Infinity;
  let bestMatchStart = -1;

  // 滑动窗口计算每个子串的编辑距离
  for (let i = 0; i <= target.length - spacer_len; i++) {
    let sub_target = target.slice(i, i + spacer_len);
    let distance = Levenshtein.get(spacer, sub_target);
    if (distance < min_distance) {
      min_distance = distance;
      bestMatchStart = i; // 记录最佳匹配的起始位置
    }
  }

  return bestMatchStart;
}

str = minEditDistance('GTTATCTTGCTAGGGCCCTGAT','TTCCTTATCTTGCTAGGGCCAGGATGGGGATCTTAG');
console.log(str)