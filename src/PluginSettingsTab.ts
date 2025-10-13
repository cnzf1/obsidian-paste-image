import type { BindOptionsExtended } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import type { ConditionalKeys } from 'type-fest';
import { Plugin } from './Plugin.ts';

import { debounce, normalizePath } from 'obsidian';
import { convertAsyncToSync, invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { t } from 'obsidian-dev-utils/obsidian/i18n/i18n';
import { confirm } from 'obsidian-dev-utils/obsidian/Modals/Confirm';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { EmptyAttachmentFolderBehavior } from 'obsidian-dev-utils/obsidian/RenameDeleteHandler';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';

import type { PluginSettings } from './PluginSettings.ts';
import type { PluginTypes } from './PluginTypes.ts';

import {
  AttachmentRenameMode,
  CollectAttachmentUsedByMultipleNotesMode,
  DefaultImageSizeDimension,
  SAMPLE_CUSTOM_TOKENS,
} from './PluginSettings.ts';
import { TOKENIZED_STRING_LANGUAGE } from './PrismComponent.ts';
import { Substitutions } from './Substitutions.ts';

const VISIBLE_WHITESPACE_CHARACTER = '␣';

export class PluginSettingsTab extends PluginSettingsTabBase<PluginTypes> {
  override plugin: Plugin;
  private _showLocationForNewAttachments: null | SettingEx;
  private _showGeneratedAttachmentFileName: SettingEx | undefined;
  private _showMarkdownUrlFormat: SettingEx | undefined;
  private _showAttachmentRenameMode: SettingEx | undefined;
  private _showShouldRenameAttachmentFolders: SettingEx | undefined;
  private _showShouldRenameAttachmentFiles: SettingEx | undefined;
  private _showShouldRenameSpecialCharacters: SettingEx | undefined;
  private _showSpecialCharactersReplacement: SettingEx | undefined;
  private _showShouldConvertPastedImagesToJpeg: SettingEx | undefined;
  private _showJpegQuality: SettingEx | undefined;
  private _showShouldRenameCollectedAttachments: SettingEx | undefined;
  private showCollectAttachmentUsedByMultipleNotesMode: SettingEx | undefined;
  private _showDuplicateNameSeparator: SettingEx | undefined;
  private _showShouldDeleteOrphanAttachments: SettingEx | undefined;
  private _showExcludePaths: SettingEx | undefined;
  private _showIncludePath: SettingEx | undefined;
  private _showResetToSampleCustomTokens: SettingEx | undefined;
  private _showTreatAsAttachmentExtensions: SettingEx | undefined;
  private _showTimeoutSeconds: SettingEx | undefined;
  private _showDefaultImageSize: SettingEx | undefined;
  private _showEmptyAttachmentFolderBehavior: SettingEx | undefined;
  private _showCustomTokens: SettingEx | undefined;
  private _showExcludePathsFromAttachmentCollecting: SettingEx | undefined;
  private _showHtmlImgAlign: SettingEx | undefined;
  private _showHtmlImgWidth: SettingEx | undefined;
  private _showHtmlImgStyle: SettingEx | undefined;

  constructor(plugin: Plugin) {
    super(plugin);
    this.plugin = plugin;
    this._showLocationForNewAttachments = null;
  }

  private setupVisible(imgFormat: string): void {
    var showMdSettings = false;
    var showHtmlSettings = false;
    if (imgFormat == 'markdown') {
      showMdSettings = true;
    } else if (imgFormat == 'html') {
      showHtmlSettings = true;
    }

    this._showLocationForNewAttachments?.setVisibility(showMdSettings || showHtmlSettings);
    this._showGeneratedAttachmentFileName?.setVisibility(showMdSettings || showHtmlSettings);
    this._showMarkdownUrlFormat?.setVisibility(showMdSettings);
    this._showAttachmentRenameMode?.setVisibility(showMdSettings);
    this._showShouldRenameAttachmentFolders?.setVisibility(showMdSettings);
    this._showShouldRenameAttachmentFiles?.setVisibility(showMdSettings);
    this._showShouldRenameSpecialCharacters?.setVisibility(showMdSettings);
    this._showSpecialCharactersReplacement?.setVisibility(showMdSettings);
    this._showShouldConvertPastedImagesToJpeg?.setVisibility(showMdSettings);
    this._showJpegQuality?.setVisibility(showMdSettings);
    this._showShouldRenameCollectedAttachments?.setVisibility(showMdSettings);
    this.showCollectAttachmentUsedByMultipleNotesMode?.setVisibility(showMdSettings);
    this._showDuplicateNameSeparator?.setVisibility(showMdSettings);
    this._showShouldDeleteOrphanAttachments?.setVisibility(showMdSettings);
    this._showExcludePaths?.setVisibility(showMdSettings);
    this._showIncludePath?.setVisibility(showMdSettings);
    this._showResetToSampleCustomTokens?.setVisibility(showMdSettings);
    this._showTreatAsAttachmentExtensions?.setVisibility(showMdSettings);
    this._showTimeoutSeconds?.setVisibility(showMdSettings);
    this._showDefaultImageSize?.setVisibility(showMdSettings);
    this._showEmptyAttachmentFolderBehavior?.setVisibility(showMdSettings);
    this._showCustomTokens?.setVisibility(showMdSettings);
    this._showExcludePathsFromAttachmentCollecting?.setVisibility(showMdSettings);

    this._showHtmlImgAlign?.setVisibility(showHtmlSettings);
    this._showHtmlImgWidth?.setVisibility(showHtmlSettings);
    this._showHtmlImgStyle?.setVisibility(showHtmlSettings);
  }

  public override display(): void {
    super.display();
    this.containerEl.empty();

    const bindOptionsWithTrim: BindOptionsExtended<PluginSettings, string, ConditionalKeys<PluginSettings, string>> = {
      componentToPluginSettingsValueConverter(uiValue: string): string {
        return normalizePath(uiValue.trimEnd());
      },
      pluginSettingsToComponentValueConverter(pluginSettingsValue: string): string {
        return pluginSettingsValue.trimEnd();
      },
      shouldResetSettingWhenComponentIsEmpty: true,
      shouldShowPlaceholderForDefaultValues: false,
    };

    new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.imageFormat.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.imageFormat.description));
          f.createEl('br');
          f.appendText('html: ');
          appendCodeBlock(f, '<img src="...">');
          f.createEl('br');
          f.appendText('markdown: ');
          appendCodeBlock(f, '![...](...)');
        }),
      )
      .addDropdown((dropDown) => {
        dropDown
          .addOptions(generateImageFormat())
          .setValue(this.plugin.settings.imageFormat)
          .onChange(async (value) => {
            // 这里的this.plugin.settings.imageFormat 不会马上被赋值，不知道为什么
            this.plugin.settingsManager.setProperty('imageFormat', value);
            // this._format?.setName(value);
            // console.debug("select: " + value + " target:" + this.plugin.settings.imageFormat);
            this.setupVisible(value);
          });
      });

    this._showHtmlImgAlign = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.htmlImageFormat.align))
      .addDropdown((dropDown) => {
        dropDown
          .addOption('left', 'left')
          .addOption('center', 'center')
          .addOption('right', 'right')
          .setValue('left')
          .onChange((value) => {
            this.plugin.settingsManager.setProperty('htmlImageAlign', value);
          });
      });

    this._showHtmlImgWidth = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.htmlImageFormat.width))
      .addText((text) => {
        text.setValue(this.plugin.settings.htmlImageWidth).onChange((value) => {
          this.plugin.settingsManager.setProperty('htmlImageWidth', value);
        });
      });

    this._showHtmlImgStyle = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.htmlImageFormat.style))
      .addText((text) => {
        text.setValue(this.plugin.settings.htmlImageStyle).onChange((value) => {
          this.plugin.settingsManager.setProperty('htmlImageStyle', value);
        });
      });

    this._showLocationForNewAttachments = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.locationForNewAttachments.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.locationForNewAttachments.description.part1));
          f.appendText(' ');
          appendCodeBlock(f, '.');
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.locationForNewAttachments.description.part2));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.locationForNewAttachments.description.part3));
          f.appendText(' ');
          f.createEl('a', {
            href: 'https://github.com/cnzf1/obsidian-paste-image?tab=readme-ov-file#tokens',
            text: t(($) => $.pluginSettingsTab.locationForNewAttachments.description.part4),
          });
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.locationForNewAttachments.description.part5));
          f.appendText(' ');
          appendCodeBlock(f, '.attachments');
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.locationForNewAttachments.description.part6));
          f.appendText(' ');
          f.createEl('a', {
            href: 'https://github.com/polyipseity/obsidian-show-hidden-files/',
            text: 'Show Hidden Files',
          });
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.locationForNewAttachments.description.part7));
        }),
      )
      .addCodeHighlighter((codeHighlighter) => {
        codeHighlighter.setLanguage(TOKENIZED_STRING_LANGUAGE);
        codeHighlighter.inputEl.addClass('tokenized-string-setting-control');
        // codeHighlighter.inputEl.style.height = "3";
        this.bind(codeHighlighter, 'attachmentFolderPath', bindOptionsWithTrim);
      });

    this._showGeneratedAttachmentFileName = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.generatedAttachmentFileName.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.generatedAttachmentFileName.description.part1));
          f.appendText(' ');
          f.createEl('a', {
            href: 'https://github.com/cnzf1/obsidian-paste-image?tab=readme-ov-file#tokens',
            text: t(($) => $.pluginSettingsTab.generatedAttachmentFileName.description.part2),
          });
          f.appendText('.');
        }),
      )
      .addCodeHighlighter((codeHighlighter) => {
        codeHighlighter.setLanguage(TOKENIZED_STRING_LANGUAGE);
        codeHighlighter.inputEl.addClass('tokenized-string-setting-control');
        this.bind(codeHighlighter, 'generatedAttachmentFileName', bindOptionsWithTrim);
      });

    this._showMarkdownUrlFormat = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.markdownUrlFormat.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.markdownUrlFormat.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.markdownUrlFormat.description.part2));
          f.appendText(' ');
          f.createEl('a', {
            href: 'https://github.com/cnzf1/obsidian-paste-image?tab=readme-ov-file#tokens',
            text: t(($) => $.pluginSettingsTab.markdownUrlFormat.description.part3),
          });
          f.appendText('.');
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.markdownUrlFormat.description.part4));
        }),
      )
      .addCodeHighlighter((codeHighlighter) => {
        codeHighlighter.setLanguage(TOKENIZED_STRING_LANGUAGE);
        codeHighlighter.inputEl.addClass('tokenized-string-setting-control');
        this.bind(codeHighlighter, 'markdownUrlFormat', bindOptionsWithTrim);
      });

    this._showAttachmentRenameMode = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.attachmentRenameMode.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.attachmentRenameMode.description.part1));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.attachmentRenameMode.none.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.attachmentRenameMode.none.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.attachmentRenameMode.onlyPastedImages.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.attachmentRenameMode.onlyPastedImages.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.attachmentRenameMode.all.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.attachmentRenameMode.all.description));
        }),
      )
      .addDropdown((dropdown) => {
        dropdown.addOptions({
          /* eslint-disable perfectionist/sort-objects -- Need to keep enum order. */
          [AttachmentRenameMode.None]: t(($) => $.pluginSettings.attachmentRenameMode.none.displayText),
          [AttachmentRenameMode.OnlyPastedImages]: t(
            ($) => $.pluginSettings.attachmentRenameMode.onlyPastedImages.displayText,
          ),
          [AttachmentRenameMode.All]: t(($) => $.pluginSettings.attachmentRenameMode.all.displayText),
          /* eslint-enable perfectionist/sort-objects -- Need to keep enum order. */
        });
        this.bind(dropdown, 'attachmentRenameMode');
      });

    this._showShouldRenameAttachmentFolders = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.shouldRenameAttachmentFolders.name))
      .setDesc(t(($) => $.pluginSettingsTab.shouldRenameAttachmentFolders.description))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldRenameAttachmentFolder');
      });

    this._showShouldRenameAttachmentFiles = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.shouldRenameAttachmentFiles.name))
      .setDesc(t(($) => $.pluginSettingsTab.shouldRenameAttachmentFiles.description))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldRenameAttachmentFiles');
      });

    this._showShouldRenameSpecialCharacters = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.specialCharacters.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.specialCharacters.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.specialCharacters.description.part2));
        }),
      )
      .addText((text) => {
        this.bind(text, 'specialCharacters', {
          componentToPluginSettingsValueConverter: (value: string): string =>
            value.replaceAll(VISIBLE_WHITESPACE_CHARACTER, ''),
          pluginSettingsToComponentValueConverter: (value: string): string =>
            value.replaceAll(' ', VISIBLE_WHITESPACE_CHARACTER),
          shouldResetSettingWhenComponentIsEmpty: false,
          shouldShowPlaceholderForDefaultValues: false,
        });
        text.inputEl.addEventListener('input', () => {
          text.inputEl.value = showWhitespaceCharacter(text.inputEl.value);
        });
      });

    this._showSpecialCharactersReplacement = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.specialCharactersReplacement.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.specialCharactersReplacement.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.specialCharactersReplacement.description.part2));
        }),
      )
      .addText((text) => {
        this.bind(text, 'specialCharactersReplacement', {
          shouldResetSettingWhenComponentIsEmpty: false,
          shouldShowPlaceholderForDefaultValues: false,
        });
      });

    this._showShouldConvertPastedImagesToJpeg = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.shouldConvertPastedImagesToJpeg.name))
      .setDesc(t(($) => $.pluginSettingsTab.shouldConvertPastedImagesToJpeg.description))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldConvertPastedImagesToJpeg');
      });

    this._showJpegQuality = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.jpegQuality.name))
      .setDesc(t(($) => $.pluginSettingsTab.jpegQuality.description))
      .addDropdown((dropDown) => {
        dropDown.addOptions(generateJpegQualityOptions());
        this.bind(dropDown, 'jpegQuality', {
          componentToPluginSettingsValueConverter: (value) => Number(value),
          pluginSettingsToComponentValueConverter: (value) => value.toString(),
        });
      });

    this._showShouldRenameCollectedAttachments = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.shouldRenameCollectedAttachments.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.shouldRenameCollectedAttachments.description.part1));
          f.appendText(' ');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettingsTab.shouldRenameCollectedAttachments.description.part2),
          );
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.shouldRenameCollectedAttachments.description.part3));
          f.appendText(' ');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettingsTab.generatedAttachmentFileName.name),
          );
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.shouldRenameCollectedAttachments.description.part4));
        }),
      )
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldRenameCollectedAttachments');
      });

    this.showCollectAttachmentUsedByMultipleNotesMode = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.collectAttachmentUsedByMultipleNotesMode.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.collectAttachmentUsedByMultipleNotesMode.description.part1));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.skip.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.skip.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.move.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.move.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.copy.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.copy.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.cancel.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.cancel.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.prompt.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.prompt.description));
        }),
      )
      .addDropdown((dropdown) => {
        dropdown.addOptions({
          /* eslint-disable perfectionist/sort-objects -- Need to keep enum order. */
          [CollectAttachmentUsedByMultipleNotesMode.Skip]: t(
            ($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.skip.displayText,
          ),
          [CollectAttachmentUsedByMultipleNotesMode.Move]: t(
            ($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.move.displayText,
          ),
          [CollectAttachmentUsedByMultipleNotesMode.Copy]: t(
            ($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.copy.displayText,
          ),
          [CollectAttachmentUsedByMultipleNotesMode.Cancel]: t(
            ($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.cancel.displayText,
          ),
          [CollectAttachmentUsedByMultipleNotesMode.Prompt]: t(
            ($) => $.pluginSettings.collectAttachmentUsedByMultipleNotesMode.prompt.displayText,
          ),
          /* eslint-enable perfectionist/sort-objects -- Need to keep enum order. */
        });
        this.bind(dropdown, 'collectAttachmentUsedByMultipleNotesMode');
      });

    this._showDuplicateNameSeparator = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.duplicateNameSeparator.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.duplicateNameSeparator.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.duplicateNameSeparator.description.part2));
          f.appendText(' ');
          appendCodeBlock(f, 'existingFile.pdf');
          f.appendText(t(($) => $.pluginSettingsTab.duplicateNameSeparator.description.part3));
          f.appendText(' ');
          appendCodeBlock(f, 'existingFile 1.pdf');
          f.appendText(', ');
          appendCodeBlock(f, 'existingFile 2.pdf');
          f.appendText(t(($) => $.pluginSettingsTab.duplicateNameSeparator.description.part4));
        }),
      )
      .addText((text) => {
        this.bind(text, 'duplicateNameSeparator', {
          componentToPluginSettingsValueConverter: (value: string) =>
            value.replaceAll(VISIBLE_WHITESPACE_CHARACTER, ' '),
          pluginSettingsToComponentValueConverter: showWhitespaceCharacter,
        });
        text.inputEl.addEventListener('input', () => {
          text.inputEl.value = showWhitespaceCharacter(text.inputEl.value);
        });
      });

    this._showEmptyAttachmentFolderBehavior = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.emptyAttachmentFolderBehavior.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.emptyAttachmentFolderBehavior.description.part1));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.emptyAttachmentFolderBehavior.keep.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.emptyAttachmentFolderBehavior.keep.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.emptyAttachmentFolderBehavior.delete.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.emptyAttachmentFolderBehavior.delete.description));
          f.createEl('br');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettings.emptyAttachmentFolderBehavior.deleteWithEmptyParents.displayText),
          );
          f.appendText(' - ');
          f.appendText(t(($) => $.pluginSettings.emptyAttachmentFolderBehavior.deleteWithEmptyParents.description));
        }),
      )
      .addDropdown((dropdown) => {
        dropdown.addOptions({
          /* eslint-disable perfectionist/sort-objects -- Need to keep enum order. */
          [EmptyAttachmentFolderBehavior.Keep]: t(
            ($) => $.pluginSettings.emptyAttachmentFolderBehavior.keep.displayText,
          ),
          [EmptyAttachmentFolderBehavior.Delete]: t(
            ($) => $.pluginSettings.emptyAttachmentFolderBehavior.delete.displayText,
          ),
          [EmptyAttachmentFolderBehavior.DeleteWithEmptyParents]: t(
            ($) => $.pluginSettings.emptyAttachmentFolderBehavior.deleteWithEmptyParents.displayText,
          ),
          /* eslint-enable perfectionist/sort-objects -- Need to keep enum order. */
        });
        this.bind(dropdown, 'emptyAttachmentFolderBehavior');
      });

    this._showShouldDeleteOrphanAttachments = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.shouldDeleteOrphanAttachments.name))
      .setDesc(t(($) => $.pluginSettingsTab.shouldDeleteOrphanAttachments.description))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldDeleteOrphanAttachments');
      });

    this._showIncludePath = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.includePaths.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.includePaths.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.includePaths.description.part2));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.includePaths.description.part3));
          f.appendText(' ');
          appendCodeBlock(
            f,
            t(($) => $.regularExpression),
          );
          f.appendText('.');
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.includePaths.description.part4));
        }),
      )
      .addMultipleText((multipleText) => {
        this.bind(multipleText, 'includePaths');
      });

    this._showExcludePaths = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.excludePaths.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.excludePaths.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.excludePaths.description.part2));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.excludePaths.description.part3));
          f.appendText(' ');
          appendCodeBlock(
            f,
            t(($) => $.regularExpression),
          );
          f.appendText('.');
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.excludePaths.description.part4));
        }),
      )
      .addMultipleText((multipleText) => {
        this.bind(multipleText, 'excludePaths');
      });

    this._showExcludePathsFromAttachmentCollecting = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.excludePathsFromAttachmentCollecting.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.excludePathsFromAttachmentCollecting.description.part1));
          f.appendText(' ');
          appendCodeBlock(
            f,
            t(($) => $.pluginSettingsTab.excludePathsFromAttachmentCollecting.description.part2),
          );
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.excludePathsFromAttachmentCollecting.description.part3));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.excludePathsFromAttachmentCollecting.description.part4));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.excludePathsFromAttachmentCollecting.description.part5));
          f.appendText(' ');
          appendCodeBlock(
            f,
            t(($) => $.regularExpression),
          );
          f.appendText('.');
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.excludePathsFromAttachmentCollecting.description.part6));
        }),
      )
      .addMultipleText((multipleText) => {
        this.bind(multipleText, 'excludePathsFromAttachmentCollecting');
      });

    const REGISTER_CUSTOM_TOKENS_DEBOUNCE_IN_MILLISECONDS = 2000;
    const registerCustomTokensDebounced = debounce((customTokensStr: string) => {
      invokeAsyncSafely(async () => {
        Substitutions.registerCustomTokens(customTokensStr);
        await this.revalidate();
      });
    }, REGISTER_CUSTOM_TOKENS_DEBOUNCE_IN_MILLISECONDS);

    this._showCustomTokens = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.customTokens.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.customTokens.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.customTokens.description.part2));
          f.appendText(' ');
          f.createEl('a', {
            href: 'https://github.com/cnzf1/obsidian-paste-image?tab=readme-ov-file#custom-tokens',
            text: t(($) => $.pluginSettingsTab.customTokens.description.part3),
          });
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.customTokens.description.part4));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.customTokens.description.part5));
        }),
      )
      .addCodeHighlighter((codeHighlighter) => {
        codeHighlighter.setLanguage('javascript');
        codeHighlighter.inputEl.addClass('custom-tokens-setting-control');
        this.bind(codeHighlighter, 'customTokensStr', {
          onChanged: (newValue) => {
            registerCustomTokensDebounced(newValue);
          },
        });
      });
    this.plugin.settingsManager.shouldDebounceCustomTokensValidation = true;

    this._showResetToSampleCustomTokens = new SettingEx(this.containerEl).addButton((button) => {
      button.setButtonText(t(($) => $.pluginSettingsTab.resetToSampleCustomTokens.title));
      button.setWarning();
      button.onClick(
        convertAsyncToSync(async () => {
          if (this.plugin.settings.customTokensStr === SAMPLE_CUSTOM_TOKENS) {
            return;
          }

          if (
            this.plugin.settings.customTokensStr !== '' &&
            !(await confirm({
              app: this.plugin.app,
              cancelButtonText: t(($) => $.obsidianDevUtils.buttons.cancel),
              message: t(($) => $.pluginSettingsTab.resetToSampleCustomTokens.message),
              okButtonText: t(($) => $.obsidianDevUtils.buttons.ok),
              title: t(($) => $.pluginSettingsTab.resetToSampleCustomTokens.title),
            }))
          ) {
            return;
          }

          await this.plugin.settingsManager.editAndSave((setting) => {
            setting.customTokensStr = SAMPLE_CUSTOM_TOKENS;
          });
          this.display();
        }),
      );
    });

    this._showTreatAsAttachmentExtensions = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.treatAsAttachmentExtensions.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.treatAsAttachmentExtensions.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.treatAsAttachmentExtensions.description.part2));
          f.appendText(' ');
          appendCodeBlock(f, '.md');
          f.appendText(', ');
          appendCodeBlock(f, '.canvas');
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.treatAsAttachmentExtensions.description.part3));
          f.appendText(' ');
          appendCodeBlock(f, '.base');
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.treatAsAttachmentExtensions.description.part4));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.treatAsAttachmentExtensions.description.part5));
          f.appendText(' ');
          appendCodeBlock(f, '.foo.md');
          f.appendText(', ');
          appendCodeBlock(f, '.bar.canvas');
          f.appendText(', ');
          appendCodeBlock(f, '.baz.base');
          f.appendText(t(($) => $.pluginSettingsTab.treatAsAttachmentExtensions.description.part6));
        }),
      )
      .addMultipleText((multipleText) => {
        this.bind(multipleText, 'treatAsAttachmentExtensions');
      });

    this._showTimeoutSeconds = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.timeoutInSeconds.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.timeoutInSeconds.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.timeoutInSeconds.description.part2));
          f.appendText(' ');
          appendCodeBlock(f, '0');
          f.appendText(' ');
          f.appendText(t(($) => $.pluginSettingsTab.timeoutInSeconds.description.part3));
        }),
      )
      .addNumber((number) => {
        number.setMin(0);
        this.bind(number, 'timeoutInSeconds');
      });

    this._showDefaultImageSize = new SettingEx(this.containerEl)
      .setName(t(($) => $.pluginSettingsTab.defaultImageSize.name))
      .setDesc(
        createFragment((f) => {
          f.appendText(t(($) => $.pluginSettingsTab.defaultImageSize.description.part1));
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.defaultImageSize.description.part2));
          f.appendText(' (');
          appendCodeBlock(f, '300px');
          f.appendText(') ');
          f.appendText(t(($) => $.pluginSettingsTab.defaultImageSize.description.part3));
          f.appendText(' (');
          appendCodeBlock(f, '50%');
          f.appendText(').');
          f.createEl('br');
          f.appendText(t(($) => $.pluginSettingsTab.defaultImageSize.description.part4));
        }),
      )
      .addText((text) => {
        this.bind(text, 'defaultImageSize');
      })
      .addDropdown((dropdown) => {
        dropdown.selectEl.addClass('default-image-size-dimension-setting-control');
        dropdown.addOptions({
          /* eslint-disable perfectionist/sort-objects -- Need to keep enum order. */
          [DefaultImageSizeDimension.Width]: t(($) => $.pluginSettings.defaultImageSizeDimension.width),
          [DefaultImageSizeDimension.Height]: t(($) => $.pluginSettings.defaultImageSizeDimension.height),
          /* eslint-enable perfectionist/sort-objects -- Need to keep enum order. */
        });
        this.bind(dropdown, 'defaultImageSizeDimension');
      });

    this.setupVisible(this.plugin.settings.imageFormat);
  }

  public override hide(): void {
    super.hide();
    this.plugin.settingsManager.shouldDebounceCustomTokensValidation = false;
  }
}

function generateJpegQualityOptions(): Record<string, string> {
  const MAX_QUALITY = 10;
  const ans: Record<string, string> = {};
  for (let i = 1; i <= MAX_QUALITY; i++) {
    const valueStr = (i / MAX_QUALITY).toFixed(1);
    ans[valueStr] = valueStr;
  }

  return ans;
}

function showWhitespaceCharacter(value: string): string {
  return value.replaceAll(' ', VISIBLE_WHITESPACE_CHARACTER);
}

function generateImageFormat(): Record<string, string> {
  const ans: Record<string, string> = {};
  ans['markdown'] = 'markdown';
  ans['html'] = 'html';

  return ans;
}
