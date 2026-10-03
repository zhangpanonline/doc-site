import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import AiSearchButton from '@site/src/components/AiSearch';
import ThemeSelect from '@site/src/theme/NavbarItem/ThemeSelect';

// 注册导航栏自定义条目类型：
// docusaurus.config.ts 的 navbar.items 里写 {type: 'custom-ai-search', position: 'right'} 即可
export default {
  ...ComponentTypes,
  'custom-ai-search': AiSearchButton,
  'custom-theme-select': ThemeSelect,
};
