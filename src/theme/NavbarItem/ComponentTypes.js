import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import AiSearchButton from '@site/src/components/AiSearch';

// 注册导航栏自定义条目类型 custom-ai-search：
// docusaurus.config.ts 的 navbar.items 里写 {type: 'custom-ai-search', position: 'right'} 即可
export default {
  ...ComponentTypes,
  'custom-ai-search': AiSearchButton,
};
